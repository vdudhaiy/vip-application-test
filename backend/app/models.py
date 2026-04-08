# Django 
from django.db import models
from django.core.files.storage import FileSystemStorage
from django.core.exceptions import ValidationError
from django.conf import settings
from django.contrib.auth.models import User

# Custom - Preprocessing functions
from .utils.preprocessing import (
    find_last_leading_text_column,
    filter_nones,
    normalize_data,
    transformation,
    impute_missing,
)
from .utils.histogram_processing import density_by_patient, density_by_case
from .utils.validation import validate_rawdata_file_extension, validate_group_file_extension

# General
import os
import csv
import pandas as pd
import numpy as np
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class OverwriteStorage(FileSystemStorage):
    def get_available_name(self, name, max_length=None):
        self.delete(name)  # Delete old file if it exists
        return name

def sanitize_dataframe_for_json(df):
    """
    Convert DataFrame to records, replacing NaN with None for JSON serialization.
    """
    df = df.copy()
    df = df.replace({np.nan: None})
    return df.to_dict(orient="records")

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
                
                # Detect file format and load accordingly
                file_ext = os.path.splitext(self.spec_data_file.name)[1].lower()
                if file_ext == '.xlsx':
                    df = pd.read_excel(self.spec_data_file)
                else:  # Default to CSV
                    df = pd.read_csv(self.spec_data_file)
                
                # Find last leading non-numeric column index (assumed to be ID column)
                last_text_col_idx = find_last_leading_text_column(df)
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
            if self.filteroption is not None and self.applyin and self.value is not None:
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
        
        self.filter_data = {"data": sanitize_dataframe_for_json(filtered_df)}
        self.num_entries = len(filtered_df)


class NormalizedData(models.Model):
    filter_model = models.OneToOneField(FilterData, on_delete=models.CASCADE)
    normalize_data = models.JSONField(null=True)
    grouping = models.JSONField(null=True)
    num_entries = models.PositiveIntegerField(default=0)
    
    # Store normalization parameters for restoration
    method = models.CharField(
        max_length=20,
        choices=[("reference", "Reference"), ("divide", "Divide"), ("subtract", "Subtract"), ("z-score", "Z-Score")],
        null=True,
        blank=True
    )
    reference = models.CharField(max_length=255, null=True, blank=True)  # Reference protein or statistic (mean/median/mode)
    statistic = models.CharField(
        max_length=10,
        choices=[("mean", "Mean"), ("median", "Median"), ("mode", "Mode")],
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    def normalize(self, reference=None, method='reference'):
        """
        Normalize filtered data using the selected method/reference.

        Parameters:
        reference: depends on method (e.g., reference protein name, mean/median/mode keyword).
        method: one of 'reference', 'divide', 'subtract', or 'z-score'.
        """
        self.grouping = self.filter_model.grouping

        update_normal = normalize_data(
            self.filter_model.filter_data['data'],
            reference=reference,
            method=method,
        )

        # DEBUG: Log the value ranges
        numeric_cols = update_normal.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            numeric_df = update_normal[numeric_cols]
            logger.info(f"[DEBUG] After {method} normalization - Min: {numeric_df.min().min()}, Max: {numeric_df.max().max()}, Shape: {numeric_df.shape}")
        
        self.normalize_data = {"data": sanitize_dataframe_for_json(update_normal)}
        self.num_entries = self.filter_model.num_entries
        self.save(update_fields=['normalize_data', 'grouping', 'num_entries', 'updated_at'])
        

class TransformedData(models.Model):
    normal = models.OneToOneField(NormalizedData, on_delete=models.CASCADE)
    transform_data = models.JSONField(null=True)
    grouping = models.JSONField(null=True)
    num_entries = models.PositiveIntegerField(default=0)
    epsilon = models.FloatField(null=True, blank=True, help_text="Epsilon value for log2 transformation. Must be set before transformation.")

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    def transform(self, epsilon=None):
        if epsilon is None:
            epsilon = self.epsilon
        
        self.grouping = self.normal.grouping
        transform_df = transformation(self.normal.normalize_data['data'], epsilon=epsilon)
        
        # DEBUG: Log the value ranges
        numeric_cols = transform_df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            numeric_df = transform_df[numeric_cols]
            logger.info(f"[DEBUG] After log2 transformation (epsilon={epsilon}) - Min: {numeric_df.min().min()}, Max: {numeric_df.max().max()}, Shape: {numeric_df.shape}")
        
        self.epsilon = epsilon
        self.transform_data = {"data": sanitize_dataframe_for_json(transform_df)}
        self.num_entries = self.normal.num_entries
        self.save(update_fields=['transform_data', 'grouping', 'num_entries', 'epsilon', 'updated_at'])

class ImputeData(models.Model):
    trans = models.OneToOneField(TransformedData, on_delete=models.CASCADE)
    impute_data = models.JSONField(null=True)
    grouping = models.JSONField(null=True)
    num_entries = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    def impute(self):
        self.grouping = self.trans.grouping
        impute_df = impute_missing(self.trans.transform_data["data"])
        
        # DEBUG: Log the imputation step
        numeric_cols = impute_df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            numeric_df = impute_df[numeric_cols]
            num_imputed = impute_df.isna().sum().sum()
            logger.info(f"[DEBUG] After imputation - Min: {numeric_df.min().min()}, Max: {numeric_df.max().max()}, Imputed cells: {num_imputed}, Shape: {numeric_df.shape}")
        
        self.impute_data = {"data": sanitize_dataframe_for_json(impute_df)}
        self.num_entries = self.trans.num_entries
        self.save(update_fields=['impute_data', 'grouping', 'num_entries', 'updated_at'])

class TtestResults(models.Model):
    impute_model = models.OneToOneField(ImputeData, on_delete=models.CASCADE)
    results_data = models.JSONField(null=True)
    reference_group = models.CharField(max_length=100, null=True, blank=True)
    num_proteins = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)  # Set only on creation
    updated_at = models.DateTimeField(auto_now=True)  # Updates on each save

    def run_analysis(self, reference_group=None):
        """
        Run final_data_analysis and store the results.
        
        Parameters:
        reference_group: optional reference group label for multi-group comparisons
        """
        from .utils.analysis import final_data_analysis
        
        self.reference_group = reference_group
        
        imputed_data = self.impute_model.impute_data['data']
        case_control = self.impute_model.grouping['grouping']
        
        df = pd.DataFrame(imputed_data)
        protein_gene_col = df.iloc[:, 0]
        protein_gene_df = pd.DataFrame({'Protein': protein_gene_col})
        
        # Keep only numeric columns for analysis
        numeric_df = df.select_dtypes(include=[np.number])
        numeric_df.insert(0, 'Protein', protein_gene_col)
        df = numeric_df
        
        result_df = final_data_analysis(df, case_control, protein_gene_df, reference_group=reference_group)
        
        # Convert DataFrame to JSON-safe records
        self.results_data = {'data': sanitize_dataframe_for_json(result_df)}
        self.num_proteins = len(result_df)
        self.save(update_fields=['results_data', 'reference_group', 'num_proteins', 'updated_at'])

class Dataset(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='datasets')
    name = models.CharField(max_length=100, null=False)
    
    raw_file = models.OneToOneField(RawDataUpload, on_delete=models.CASCADE, null=True)
    group_file = models.OneToOneField(GroupDataUpload, on_delete=models.CASCADE, null=True)
    
    filtered_data = models.OneToOneField(FilterData, on_delete=models.CASCADE, null=True)
    normal_data = models.OneToOneField(NormalizedData, on_delete=models.CASCADE, null=True)
    transformed_data = models.OneToOneField(TransformedData, on_delete=models.CASCADE, null=True)
    impute_data = models.OneToOneField(ImputeData, on_delete=models.CASCADE, null=True)
    ttest_results = models.OneToOneField(TtestResults, on_delete=models.CASCADE, null=True)

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
            # Only transform if normal_data is newer than transformed_data AND epsilon is set
            needs_transform = (
                self.transformed_data and
                self.transformed_data.epsilon is not None and
                (self.transformed_data.updated_at < self.normal_data.updated_at)
            )
            if needs_transform:
                self.transformed_data.transform(epsilon=self.transformed_data.epsilon)
            elif not self.transformed_data:
                # Create transformed_data object but don't transform until epsilon is selected
                self.transformed_data, _ = TransformedData.objects.get_or_create(
                    normal=self.normal_data
                )

        # ---------------------------
        # Step 4: Impute
        # ---------------------------
        # Only impute if transformation has been completed (transform_data exists)
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

        # ---------------------------
        # Step 5: Ttest Results (created but not auto-run)
        # ---------------------------
        # Create TtestResults object if impute_data exists, but don't auto-run analysis
        # The user will explicitly run this via API endpoint
        if self.impute_data and not self.ttest_results:
            ttest_results, _ = TtestResults.objects.get_or_create(
                impute_model=self.impute_data
            )
            self.ttest_results = ttest_results
        
    def save(self, *args, **kwargs):
        self.pipeline()
        super().save(*args, **kwargs)