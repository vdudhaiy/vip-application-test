from rest_framework import serializers
import numpy as np
import pandas as pd
from .models import *
from .utils.histogram_processing import *
from django.conf import settings
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email']

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            email=validated_data['email']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

class DatasetSerializer(serializers.ModelSerializer):
    raw_file_id = serializers.PrimaryKeyRelatedField(read_only=True)
    group_file_id = serializers.PrimaryKeyRelatedField(read_only=True)
    filtered_data_id = serializers.PrimaryKeyRelatedField(read_only=True)
    normal_data_id = serializers.PrimaryKeyRelatedField(read_only=True)
    transformed_data_id = serializers.PrimaryKeyRelatedField(read_only=True)
    impute_data_id = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Dataset
        fields = [
            'id',
            'name',
            'user',
            'created_at',
            'updated_at',
            'raw_file_id',
            'group_file_id',
            'filtered_data_id',
            'normal_data_id',
            'transformed_data_id',
            'impute_data_id'
        ]
    
class RawDataUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawDataUpload
        fields = '__all__'


class GroupDataUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupDataUpload
        fields = '__all__'

class FilterSerializer(serializers.ModelSerializer):
    density_patient = serializers.SerializerMethodField()
    density_case = serializers.SerializerMethodField()

    class Meta:
        model = FilterData
        fields = '__all__'
    
    def get_density_patient(self, obj):
        if obj.filter_data:
            return density_by_patient(pd.DataFrame.from_records(obj.filter_data['data']))
        else:
            return None
    
    def get_density_case(self, obj):
        if obj.filter_data:
            return density_by_case(pd.DataFrame.from_records(obj.filter_data['data']), obj.grouping['grouping'])
        else:
            return None
    
    def update(self, instance, validated_data):
        # Update simple fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If there is a related NormalizedData, update it instead of creating a new one
        try:
            normalized = instance.normalizeddata
            # perform updates on normalized if needed
            normalized.save()
        except AttributeError:
            # No related normalizeddata exists yet; optionally create it if needed
            pass

        return instance

class NormalSerializer(serializers.ModelSerializer):
    density_patient = serializers.SerializerMethodField()
    density_case = serializers.SerializerMethodField()

    class Meta:
        model = NormalizedData
        fields = '__all__'
    
    def get_density_patient(self, obj):
        if obj.normalize_data:
            return density_by_patient(pd.DataFrame.from_records(obj.normalize_data['data']))
        else:
            return None
    
    def get_density_case(self, obj):
        if obj.normalize_data:
            return density_by_case(pd.DataFrame.from_records(obj.normalize_data['data']), obj.grouping['grouping'])
        else:
            return None
    

class TransformSerializer(serializers.ModelSerializer):
    density_patient = serializers.SerializerMethodField()
    density_case = serializers.SerializerMethodField()

    class Meta:
        model = TransformedData
        fields = '__all__'
    
    def get_density_patient(self, obj):
        if obj.transform_data:
            return density_by_patient(pd.DataFrame.from_records(obj.transform_data['data']))
        else:
            return None
    
    def get_density_case(self, obj):
        if obj.transform_data:
            return density_by_case(pd.DataFrame.from_records(obj.transform_data['data']), obj.grouping['grouping'])
        else:
            return None

class ImputeSerializer(serializers.ModelSerializer):
    density_patient = serializers.SerializerMethodField()
    density_case = serializers.SerializerMethodField()

    class Meta:
        model = ImputeData
        fields = '__all__'
    
    def get_density_patient(self, obj):
        if obj.impute_data:
            return density_by_patient(pd.DataFrame.from_records(obj.impute_data['data']))
        else:
            return None
    
    def get_density_case(self, obj):
        if obj.impute_data:
            return density_by_case(pd.DataFrame.from_records(obj.impute_data['data']), obj.grouping['grouping'])
        else:
            return None
