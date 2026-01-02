# Django 
from django.db import models
from django.core.files.storage import FileSystemStorage
from django.core.exceptions import ValidationError
from django.conf import settings
from django.contrib.auth.models import User

# Custom
from .utils.preprocessing import *
from .utils.histogram_processing import *
from .utils.validation import *

# General
import os
import csv
import pandas as pd
import numpy as np
import json
from datetime import datetime


class OverwriteStorage(FileSystemStorage):
    def get_available_name(self, name, max_length=None):
        self.delete(name)  # Delete old file if it exists
        return name

class RawDataUpload(models.Model):
    spec_data_file = models.FileField(upload_to="rawdata/", storage=OverwriteStorage(), validators=[validate_rawdata_file_extension, ])
    num_entries = models.PositiveIntegerField(default=0)
    spec_data = models.JSONField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    # Save file with new name. Note: Django can only accept files whose name is less than 100 characters.
    def save(self, *args, user=None, **kwargs):
        # Custom file naming convention 
        if not self.pk and self.spec_data_file:
            filename_og, file_extension = os.path.splitext(self.spec_data_file.name)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            user_id_str = f"user{user.id}_" if user else ""
            sv_filename = f"{user_id_str}MassSpecData_{timestamp}{file_extension}"
            self.spec_data_file.name = sv_filename

        # Read and parse the file before calling super().save()
        if self.spec_data_file:
            try:
                # Ensure we're reading from the beginning
                self.spec_data_file.seek(0)
                df = pd.read_csv(self.spec_data_file)
                # Find last non-numeric column index (assumed to be ID column)
                last_text_col_idx = find_last_text_column(df)
                # Remove remaining non-numeric columns if any (except the last_text_col_idx)
                non_numeric_cols = [col for col in df.columns if not np.issubdtype(df[col].dtype, np.number) and df.columns.get_loc(col) != last_text_col_idx]
                df = df.drop(columns=non_numeric_cols)
                df = df.replace({np.nan: None})

                self.spec_data = {'data': df.to_dict(orient="records")}
                self.num_entries = len(df)
                
                # Reset the file pointer in case it's needed later
                self.spec_data_file.seek(0)
            except Exception as e:
                raise ValidationError(f"Error parsing uploaded file: {e}")

        # Call the real save
        super().save(*args, **kwargs)

class GroupDataUpload(models.Model):
    group_data_file = models.FileField(upload_to="group/", storage=OverwriteStorage(), validators=[validate_group_file_extension])
    num_entries = models.PositiveIntegerField(default=0)
    num_groups = models.PositiveIntegerField(default=0)
    grouping = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    # Save file with new name. Note: Django can only accept files whose name is less than 100 characters.
    def save(self, *args, user=None, **kwargs):        
        # Custom file naming convention
        if not self.pk and self.group_data_file:
            _, file_extension = os.path.splitext(self.group_data_file.name)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            user_id_str = f"user{user.id}_" if user else ""
            sv_filename = f"{user_id_str}GroupData_{timestamp}{file_extension}"
            self.group_data_file.name = sv_filename

        # Read and parse the file before calling super().save()
        if self.group_data_file:
            try:
                self.group_data_file.seek(0)
                # Assuming the file is a text file formatted with
                # first line: "num_entries num_groups <something>"
                # second line: comma separated grouping info
                first_line = self.group_data_file.readline().decode().strip()
                second_line = self.group_data_file.readline().decode().strip()

                num_entries, num_groups, _ = map(int, first_line.split())
                grouping = [grp.strip() for grp in second_line.split(",")]

                self.num_entries = num_entries
                self.num_groups = num_groups
                self.grouping = {'grouping': grouping}

                self.group_data_file.seek(0)
            except Exception as e:
                raise ValidationError(f"Error parsing uploaded file: {e}")

        super().save(*args, **kwargs)

class FilterData(models.Model):
    raw_file = models.OneToOneField(RawDataUpload, on_delete=models.CASCADE, null=True)
    group_file = models.OneToOneField(GroupDataUpload, on_delete=models.CASCADE, null=True)

    filteroption = models.CharField(blank=True, choices=[("percentage","Percentage"), ("number", "Number")], max_length=12)
    applyin = models.CharField(blank=True, choices=[("inTotal", "In Total"), ("inEach", "In Each"), ("inEither", "In Either")], max_length=10)
    value = models.PositiveIntegerField(null=True)
    
    filter_data = models.JSONField(null=True)
    grouping = models.JSONField(null=True)
    num_entries = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save
    
    def save(self, *args, **kwargs):
        if self.raw_file and self.group_file:
            if self.filteroption and self.applyin and self.value:
                self.filtered_data()
        super().save(*args, **kwargs)
    
    def filtered_data(self):       
        self.grouping = self.group_file.grouping
        
        filtered_df = filter_nones(
            self.raw_file.spec_data['data'],
            self.grouping['grouping'],
            filteroption=self.filteroption,
            applyin=self.applyin,
            val=self.value
        )
        
        self.filter_data = {"data":filtered_df.to_dict(orient="records")}
        self.num_entries = len(filtered_df)


class NormalizedData(models.Model):
    filter_model = models.OneToOneField(FilterData, on_delete=models.CASCADE)
    normalize_data = models.JSONField(null=True)
    grouping = models.JSONField(null=True)
    num_entries = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    def normalize(self, reference_entry='iRT-Kit_WR_fusion'):
        self.grouping = self.filter_model.grouping
        update_normal = normalize_data(self.filter_model.filter_data['data'], reference_entry=reference_entry)
        self.normalize_data = {"data":update_normal.to_dict(orient="records")}
        self.num_entries = self.filter_model.num_entries
        self.save(update_fields=['normalize_data', 'grouping', 'num_entries', 'updated_at'])
        

class TransformedData(models.Model):
    normal = models.OneToOneField(NormalizedData, on_delete=models.CASCADE)
    transform_data = models.JSONField(null=True)
    grouping = models.JSONField(null=True)
    num_entries = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    def transform(self):
        self.grouping = self.normal.grouping
        self.transform_data = {"data":transformation(self.normal.normalize_data['data']).to_dict(orient="records")}
        self.num_entries = self.normal.num_entries
        self.save(update_fields=['transform_data', 'grouping', 'num_entries', 'updated_at'])

class ImputeData(models.Model):
    trans = models.OneToOneField(TransformedData, on_delete=models.CASCADE)
    impute_data = models.JSONField(null=True)
    grouping = models.JSONField(null=True)
    num_entries = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    def impute(self):
        self.grouping = self.trans.grouping
        self.impute_data = {"data":impute_missing(self.trans.transform_data["data"]).to_dict(orient="records")}
        self.num_entries = self.trans.num_entries
        self.save(update_fields=['impute_data', 'grouping', 'num_entries', 'updated_at'])

class Dataset(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='datasets')
    name = models.CharField(max_length=100, null=False)
    
    raw_file = models.OneToOneField(RawDataUpload, on_delete=models.CASCADE, null=True)
    group_file = models.OneToOneField(GroupDataUpload, on_delete=models.CASCADE, null=True)
    
    filtered_data = models.OneToOneField(FilterData, on_delete=models.CASCADE, null=True)
    normal_data = models.OneToOneField(NormalizedData, on_delete=models.CASCADE, null=True)
    transformed_data = models.OneToOneField(TransformedData, on_delete=models.CASCADE, null=True)
    impute_data = models.OneToOneField(ImputeData, on_delete=models.CASCADE, null=True)

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    def pipeline(self):
        # ---------------------------
        # Step 1: Filter
        # ---------------------------
        if self.raw_file and self.group_file:
            if not self.filtered_data:
                self.filtered_data = FilterData.objects.create(
                    raw_file=self.raw_file,
                    group_file=self.group_file
                )
            else:
                # Only update if upstream files have changed
                if (self.filtered_data.raw_file != self.raw_file or
                    self.filtered_data.group_file != self.group_file):
                    self.filtered_data.raw_file = self.raw_file
                    self.filtered_data.group_file = self.group_file
                    self.filtered_data.save()

        # ---------------------------
        # Step 2: Normalize
        # ---------------------------
        if self.filtered_data and self.filtered_data.filter_data:
            # Only normalize if filter_data is newer than normal_data
            needs_normalize = (
                not self.normal_data or
                (self.normal_data.updated_at < self.filtered_data.updated_at)
            )
            if needs_normalize:
                normal_data, _ = NormalizedData.objects.get_or_create(
                    filter_model=self.filtered_data
                )
                self.normal_data = normal_data
                self.normal_data.normalize()

        # ---------------------------
        # Step 3: Transform
        # ---------------------------
        if self.normal_data and self.normal_data.normalize_data:
            # Only transform if normal_data is newer than transformed_data
            needs_transform = (
                not self.transformed_data or
                (self.transformed_data.updated_at < self.normal_data.updated_at)
            )
            if needs_transform:
                transformed_data, _ = TransformedData.objects.get_or_create(
                    normal=self.normal_data
                )
                self.transformed_data = transformed_data
                self.transformed_data.transform()

        # ---------------------------
        # Step 4: Impute
        # ---------------------------
        if self.transformed_data and self.transformed_data.transform_data:
            # Only impute if transformed_data is newer than impute_data
            needs_impute = (
                not self.impute_data or
                (self.impute_data.updated_at < self.transformed_data.updated_at)
            )
            if needs_impute:
                impute_data, _ = ImputeData.objects.get_or_create(
                    trans=self.transformed_data
                )
                self.impute_data = impute_data
                self.impute_data.impute()
        
    def save(self, *args, **kwargs):
        self.pipeline()
        super().save(*args, **kwargs)