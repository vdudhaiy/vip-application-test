import csv
import pandas as pd
import json
import numpy as np
import traceback

from django.shortcuts import render
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate

from .serializer import *
from .utils.analysis import (
    final_data_analysis,
    select_top_proteins,
    prepare_volcano,
    prepare_heatmap,
    prepare_pairwise_volcanos,
)
from .utils.histogram_processing import density_by_patient, density_by_case
from .models import Dataset, RawDataUpload, GroupDataUpload, FilterData, NormalizedData, TransformedData, ImputeData, TtestResults

# Logger
import logging
logger = logging.getLogger(__name__)

# Basic root view
@api_view(['GET'])
@permission_classes([AllowAny])
def root(request):
    return Response({"message": "Welcome to the VIP API"}, status=status.HTTP_200_OK)


# Health Check View
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"}, status=status.HTTP_200_OK)

# User Management
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user)
    return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token = Token.objects.create(user=user)
        return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    request.user.auth_token.delete()
    return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")

    if not user.check_password(old_password):
        return Response({"error": "Wrong password."}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_users(request):
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


class DatasetView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        user = request.user
        serializer = DatasetSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request):
        user = request.user
        dataset_id = request.query_params.get('dataset_id')

        if dataset_id:
            try:
                dataset = Dataset.objects.get(id=dataset_id, user=user)
                serializer = DatasetSerializer(dataset)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Dataset.DoesNotExist:
                return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            datasets = Dataset.objects.filter(user=user).order_by('-created_at')
            serializer = DatasetSerializer(datasets, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
    
    def delete(self, request):
        user = request.user
        dataset_id = request.query_params.get('dataset_id')

        if not dataset_id:
            return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dataset = Dataset.objects.get(id=dataset_id, user=user)
            dataset.delete()
            return Response({"message": "Dataset deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RawDataUploadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        user = request.user
        file = request.FILES.get('file')
        dataset_id = request.query_params.get('dataset_id')

        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        if not dataset_id:
            return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

        # Delete old group file if it exists
        if dataset.raw_file:
            dataset.raw_file.spec_data_file.delete(save=False)  # delete file from storage
        
        raw_instance = dataset.raw_file or RawDataUpload()

        # Serialize and save RawDataUpload
        try:
            serializer = RawDataUploadSerializer(raw_instance, data={'spec_data_file': file}, partial=True)
            
            if serializer.is_valid():
                raw_instance = serializer.save()

                # Link to dataset
                dataset.raw_file = raw_instance
                dataset.save()

                return Response({"message": "File uploaded and associated with dataset", "dataset_id": dataset.id, "num_entries": raw_instance.num_entries}
                                , status=status.HTTP_200_OK)

            logger.error(f"RawDataUpload serializer validation failed: {serializer.errors}")
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"RawDataUpload error: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request):
        try:
            user = request.user
            dataset_id = request.query_params.get('dataset_id')

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

            file = dataset.raw_file
            serializer = RawDataUploadSerializer(file)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=400)


class GroupDataUploadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        user = request.user
        file = request.FILES.get('file')
        dataset_id = request.query_params.get('dataset_id')

        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        if not dataset_id:
            return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        dataset = get_object_or_404(Dataset, id=dataset_id, user=user)
        
        # Delete old group file if it exists
        if dataset.group_file:
            dataset.group_file.group_data_file.delete(save=False)  # delete file from storage
        
        group_instance = dataset.group_file or GroupDataUpload()

        # Serialize and save GroupDataUpload
        serializer = GroupDataUploadSerializer(group_instance, data={'group_data_file': file}, partial=True)

        if serializer.is_valid():
            group_instance = serializer.save()

            # Link to dataset
            dataset.group_file = group_instance
            dataset.save()

            return Response({"message": "File uploaded and associated with dataset", "dataset_id": dataset.id}
                            , status=status.HTTP_200_OK)

        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request):
        try:
            user = request.user
            dataset_id = request.query_params.get('dataset_id')

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

            file = dataset.group_file
            serializer = GroupDataUploadSerializer(file)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=400)


class DataView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        try:
            user = request.user
            dataset_id = request.query_params.get('dataset_id')

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

            # Add defensive checks with detailed error messages
            if not dataset.raw_file:
                return Response({"error": "Raw data file not uploaded for this dataset"}, status=status.HTTP_400_BAD_REQUEST)
            
            spec_data = dataset.raw_file.spec_data
            if not spec_data:
                return Response({"error": "Mass spec data could not be parsed from raw file"}, status=status.HTTP_400_BAD_REQUEST)
            
            if not dataset.group_file:
                return Response({"error": "Group/classification file not uploaded for this dataset"}, status=status.HTTP_400_BAD_REQUEST)
            
            group_data = dataset.group_file.grouping
            if not group_data:
                return Response({"error": "Grouping information could not be parsed from group file"}, status=status.HTTP_400_BAD_REQUEST)
            
            density_patient = density_by_patient(pd.DataFrame(spec_data['data']))
            density_case = density_by_case(pd.DataFrame(spec_data['data']), group_data['grouping'])
            density_plots = {'density_patient': density_patient, 'density_case': density_case}

            return Response(density_plots, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"DataView error: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FilterView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        try:
            user = request.user
            dataset_id = request.query_params.get('dataset_id')

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

            filter = dataset.filtered_data
            if not filter:
                return Response({"error": "Filter has not been created yet. Please upload both raw data and group files first, then set filter parameters."}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = FilterSerializer(filter)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"FilterView GET error: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request):
        # Post request makes updates to filter and returns updated filter data as well
        try:
            user = request.user
            dataset_id = request.query_params.get('dataset_id')

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)
            
            # Check if FilterData exists; if not, create one, else assign the files to the existing filter model
            filter_data = dataset.filtered_data
            if not filter_data:
                if not dataset.raw_file or not dataset.group_file:
                    return Response({"error": "Raw or Group file missing from dataset"}, status=status.HTTP_400_BAD_REQUEST)
                
                # Create FilterData and assign it to the Dataset
                filter_data = FilterData.objects.create(
                    raw_file=dataset.raw_file,
                    group_file=dataset.group_file
                )
                dataset.filtered_data = filter_data
                dataset.save()
            else:
                filter_data.raw_file = dataset.raw_file
                filter_data.group_file = dataset.group_file
                        
            serializer = FilterSerializer(filter_data, data=request.data, partial=True)

            # Save will re-run filtering with new parameters
            logger.info("Updating FilterData with data: %s", request.data)
            if serializer.is_valid():
                serializer.save()
                # dataset.refresh_from_db()
                dataset.save()
                return Response({"message": "Filter options updated successfully", "data": serializer.data}
                                , status=status.HTTP_200_OK)
            
            # Log serializer errors to help debugging why the request is a Bad Request
            logger.error("Filter serializer validation failed: %s", serializer.errors)
            # Also include the raw incoming data for additional context
            logger.error("Filter request raw data: %s", request.data)
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"FilterView POST error: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class NormalView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        try:
            user = request.user
            dataset_id = request.query_params.get('dataset_id')
            get_entries = request.query_params.get('get_entries', 'false').lower() == 'true'

            logger.debug(f"NormalView GET called with dataset_id: {dataset_id}, get_entries: {get_entries}")

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

            # If requesting available entries, return ID column values
            if get_entries:
                if not dataset.filtered_data or not dataset.filtered_data.filter_data:
                    return Response({"error": "Filtered data does not exist"}, status=status.HTTP_400_BAD_REQUEST)
                
                records = dataset.filtered_data.filter_data['data']
                
                if not records:
                    return Response({"error": "No records found in filtered data"}, status=status.HTTP_400_BAD_REQUEST)
                
                # Assume first column is non-numeric identifier (e.g., protein/gene names)
                first_col_name = list(records[0].keys())[0]
                values = [rec.get(first_col_name) for rec in records if rec.get(first_col_name) is not None]
                entries = list(dict.fromkeys(values))  # dict.fromkeys() preserves insertion order
                return Response({"entries": entries}, status=status.HTTP_200_OK)

            normal = dataset.normal_data
            if not normal:
                return Response({"error": "normalization does not exist"}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = NormalSerializer(normal)
            # dataset.refresh_from_db()
            dataset.save()

            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    def post(self, request):
        try:
            user = request.user
            dataset_id = request.data.get('dataset_id')
            method = request.data.get('method', "reference")
            reference = request.data.get('reference', {})
            statistic = request.data.get('statistic', "mean")  # Default statistic

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if not method:
                return Response({"error": "method is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if  method != "z-score" and not reference:
                return Response({"error": "reference is required, please make appropriate selections."}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

            if not dataset.filtered_data or not dataset.filtered_data.filter_data:
                return Response({"error": "Filtered data does not exist"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get or create normalized data
            if not dataset.normal_data:
                dataset.normal_data = NormalizedData.objects.get_or_create(filter_model=dataset.filtered_data)[0]
            
            # Save the normalization parameters for future restoration
            dataset.normal_data.method = method
            dataset.normal_data.reference = reference
            dataset.normal_data.statistic = statistic
            
            # Normalize with the selected reference and method
            dataset.normal_data.normalize(reference=reference, method=method)
            
            # Trigger pipeline to update downstream steps
            dataset.save()
            
            serializer = NormalSerializer(dataset.normal_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class TransformView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            user = request.user
            dataset_id = request.query_params.get('dataset_id')

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

            transform = dataset.transformed_data
            if not transform:
                return Response({"error": "transformation does not exist"}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = TransformSerializer(transform)
            # dataset.refresh_from_db()
            dataset.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    def post(self, request):
        try:
            user = request.user
            dataset_id = request.data.get('dataset_id')
            epsilon = request.data.get('epsilon', 1e-6)

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)
            
            # Ensure transformed_data exists
            if not dataset.transformed_data or not dataset.normal_data:
                return Response({"error": "normalized data must exist before transformation"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Apply transformation with the specified epsilon
            dataset.transformed_data.transform(epsilon=float(epsilon))
            
            # Trigger downstream pipeline
            dataset.save()
            
            serializer = TransformSerializer(dataset.transformed_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in TransformView POST: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=400)


class ImputationView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        try:
            user = request.user
            dataset_id = request.query_params.get('dataset_id')

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

            imputation = dataset.impute_data
            if not imputation:
                return Response({"error": "imputation does not exist"}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = ImputeSerializer(imputation)
            dataset.refresh_from_db()
            dataset.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
        

# Utility function to recursively clean JSON-unsafe float values
def sanitize_for_json(obj):
    if isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, (list, tuple)):
        return [sanitize_for_json(x) for x in obj]
    elif isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    return obj

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_volcano_plot_data(request):
    """
    Get volcano plot preparation data for visualization.
    
    Query Parameters:
    - dataset_id: Required
    - reference_group: Optional (for multi-group comparisons)
    - log2fc_thresh: Log2 fold-change threshold (default: 0.58)
    - qval_thresh: q-value threshold (default: 0.05)
    - pval_thresh: p-value threshold (default: 0.05)
    """
    try:
        user = request.user
        dataset_id = request.query_params.get('dataset_id')
        reference_group = request.query_params.get('reference_group', None)
        log2fc_thresh = float(request.query_params.get('log2fc_thresh', 0.58))
        qval_thresh = float(request.query_params.get('qval_thresh', 0.05))
        pval_thresh = float(request.query_params.get('pval_thresh', 0.05))

        if not dataset_id:
            return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

        if not dataset.impute_data:
            return Response({"error": "Imputed data does not exist. Complete the preprocessing pipeline first."}, 
                          status=status.HTTP_400_BAD_REQUEST)

        if not dataset.impute_data.impute_data or not dataset.impute_data.grouping:
            return Response({"error": "Imputed data or grouping information is missing."}, 
                          status=status.HTTP_400_BAD_REQUEST)

        imputed_data = dataset.impute_data.impute_data.get('data')
        case_control = dataset.impute_data.grouping.get('grouping')

        if not imputed_data or not case_control:
            return Response({"error": "Imputed data or grouping is empty."}, 
                          status=status.HTTP_400_BAD_REQUEST)

        df = pd.DataFrame(imputed_data)
        protein_gene_col = df.iloc[:, 0]
        protein_gene_df = pd.DataFrame({'Protein': protein_gene_col})

        numeric_df = df.select_dtypes(include=[np.number])
        numeric_df.insert(0, 'Protein', protein_gene_col)
        df = numeric_df

        result_df = final_data_analysis(df, case_control, protein_gene_df, reference_group=reference_group)
        
        # Extract unique groups in order
        groups = list(dict.fromkeys(case_control))
        
        # Prepare volcano data based on number of groups
        if len(groups) > 2 and reference_group:
            # Multiple groups with reference group specified - use pairwise volcanoes
            volcano_payloads = prepare_pairwise_volcanos(
                df,
                case_control,
                protein_gene_df,
                reference_group=reference_group,
                log2fc_thresh=log2fc_thresh,
                qval_thresh=qval_thresh,
                pval_thresh=pval_thresh
            )
            volcano_json = {
                "pairwise_volcanos": {},
                "reference_group": reference_group,
                "groups": groups
            }
            # Convert each pairwise volcano to JSON
            for contrast_label, payload in volcano_payloads.items():
                try:
                    volcano_data_df = payload.get("volcano_data")
                    if volcano_data_df is None:
                        raise ValueError(f"volcano_data is None for {contrast_label}")
                    volcano_data_records = json.loads(volcano_data_df.to_json(orient='records'))
                    volcano_json["pairwise_volcanos"][contrast_label] = {
                        "volcano_data": volcano_data_records,
                        "thresholds": sanitize_for_json(payload.get("thresholds", {}))
                    }
                except Exception as e:
                    logger.error(f"Error serializing pairwise volcano {contrast_label}: {str(e)}", exc_info=True)
        else:
            # Two groups or no reference specified - use standard single volcano
            volcano = prepare_volcano(
                result_df,
                log2fc_thresh=log2fc_thresh,
                qval_thresh=qval_thresh,
                pval_thresh=pval_thresh
            )
            try:
                volcano_data_df = volcano.get("volcano_data")
                if volcano_data_df is None:
                    raise ValueError("volcano_data is None")
                volcano_data_records = json.loads(volcano_data_df.to_json(orient='records'))
            except Exception as e:
                logger.error(f"Error serializing volcano data: {str(e)}", exc_info=True)
                volcano_data_records = []
            
            volcano_json = {
                "volcano_data": volcano_data_records,
                "thresholds": sanitize_for_json(volcano.get("thresholds", {})),
                "groups": groups
            }

        return Response(volcano_json, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in get_volcano_plot_data: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_heatmap_data(request):
    """
    Get heatmap preparation data for visualization.
    
    Query Parameters:
    - dataset_id: Required
    - top_n: Number of top proteins to include (default: 20)
    - aggregate_to_protein_level: Whether to aggregate to protein level (default: true)
    - aggregation_method: Method for aggregation - 'mean' or 'median' (default: mean)
    - by: Metric to rank proteins - 'p_value' or 'log2FC' (default: p_value)
    """
    try:
        user = request.user
        dataset_id = request.query_params.get('dataset_id')
        top_n = request.query_params.get('top_n', 20)
        aggregate_to_protein_level = request.query_params.get('aggregate_to_protein_level', 'true').lower() == 'true'
        aggregation_method = request.query_params.get('aggregation_method', 'mean')
        by = request.query_params.get('by', 'p_value')

        # Validate parameters
        if aggregation_method not in ['mean', 'median']:
            aggregation_method = 'mean'
        
        if by not in ['p_value', 'log2FC']:
            by = 'p_value'
        
        try:
            top_n = int(top_n)
            if top_n < 1:
                top_n = 20
        except (ValueError, TypeError):
            top_n = 20

        if not dataset_id:
            return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

        if not dataset.impute_data:
            return Response({"error": "Imputed data does not exist. Complete the preprocessing pipeline first."}, 
                          status=status.HTTP_400_BAD_REQUEST)

        if not dataset.impute_data.impute_data or not dataset.impute_data.grouping:
            return Response({"error": "Imputed data or grouping information is missing."}, 
                          status=status.HTTP_400_BAD_REQUEST)

        imputed_data = dataset.impute_data.impute_data.get('data')
        case_control = dataset.impute_data.grouping.get('grouping')

        if not imputed_data or not case_control:
            return Response({"error": "Imputed data or grouping is empty."}, 
                          status=status.HTTP_400_BAD_REQUEST)

        df = pd.DataFrame(imputed_data)
        protein_gene_col = df.iloc[:, 0]
        protein_gene_df = pd.DataFrame({'Protein': protein_gene_col})

        numeric_df = df.select_dtypes(include=[np.number])
        numeric_df.insert(0, 'Protein', protein_gene_col)
        df = numeric_df

        result_df = final_data_analysis(df, case_control, protein_gene_df)
        
        # Select top proteins based on ranking metric
        top_proteins = select_top_proteins(result_df, n=top_n, by=by)
        logger.info(f"[HEATMAP] Selected {len(top_proteins)} unique proteins for top_n={top_n}: {top_proteins}")
        
        heatmap = prepare_heatmap(
            df,
            top_proteins,
            case_control,
            aggregate_to_protein_level=aggregate_to_protein_level,
            aggregation_method=aggregation_method
        )

        # Sanitize heatmap data: convert DataFrame matrix to JSON records
        try:
            heatmap_matrix = heatmap.get("matrix")
            if heatmap_matrix is not None:
                # Convert matrix (DataFrame) to list of lists (rows)
                matrix_data = [[sanitize_for_json(v) for v in row] for row in heatmap_matrix.values]
                heatmap_json = {
                    "matrix": matrix_data,
                    "row_labels": heatmap_matrix.index.tolist(),
                    "column_labels": heatmap_matrix.columns.tolist(),
                    "row_order": heatmap.get("row_order", []),
                    "col_order": heatmap.get("col_order", []),
                    "col_group_labels": heatmap.get("col_group_labels", []),
                    "value_range": heatmap.get("value_range", {}),
                    "total_proteins": len(result_df),
                    "current_top_n": top_n,
                    "aggregate_to_protein_level": aggregate_to_protein_level,
                    "aggregation_method": aggregation_method
                }
            else:
                heatmap_json = {}
        except Exception as e:
            logger.error(f"Error serializing heatmap data: {str(e)}", exc_info=True)
            heatmap_json = {}

        return Response(heatmap_json, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in get_heatmap_data: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def run_ttest_analysis(request):
    """
    Run statistical t-test analysis and store results in TtestResults model.
    
    POST Parameters (JSON body):
    - dataset_id: Required
    - reference_group: Optional reference group for multi-group comparisons
    
    GET Parameters (query string):
    - dataset_id: Required
    - reference_group: Optional reference group for multi-group comparisons
    """
    try:
        user = request.user
        
        # Handle both POST (body) and GET (query params)
        if request.method == 'POST':
            dataset_id = request.data.get('dataset_id')
            reference_group = request.data.get('reference_group', None)
        else:  # GET
            dataset_id = request.query_params.get('dataset_id')
            reference_group = request.query_params.get('reference_group', None)

        if not dataset_id:
            return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

        if not dataset.ttest_results:
            return Response({"error": "TtestResults object not initialized. Complete the pipeline first."}, 
                          status=status.HTTP_400_BAD_REQUEST)

        if not dataset.impute_data or not dataset.impute_data.impute_data:
            return Response({"error": "Imputed data does not exist"}, status=status.HTTP_400_BAD_REQUEST)

        # Run the analysis
        logger.info(f"Running ttest analysis for dataset {dataset_id} with reference_group={reference_group}")
        dataset.ttest_results.run_analysis(reference_group=reference_group)

        # Return the results
        serializer = TtestResultsSerializer(dataset.ttest_results)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in run_ttest_analysis: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TtestResultsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get the ttest results for a dataset"""
        try:
            user = request.user
            dataset_id = request.query_params.get('dataset_id')

            if not dataset_id:
                return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=user)

            if not dataset.ttest_results or not dataset.ttest_results.results_data:
                return Response({"error": "Ttest results do not exist. Run analysis first."}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            serializer = TtestResultsSerializer(dataset.ttest_results)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error in TtestResultsView GET: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)