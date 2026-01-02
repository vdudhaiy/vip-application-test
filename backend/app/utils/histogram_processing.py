# ** THE WHOLE PAGE BY ISAAC FOR DQ CHECK HISTOGRAM ** 
import pandas as pd
import numpy as np
from scipy import stats

def calculate_limits(values, adjust=False):
    # If the list is empty, return zero for both limits.
    if len(values) == 0:
        return {'lower': 0, 'upper': 0}
    
    # Calculate the minimum and maximum values.
    lower = min(values)
    upper = max(values)

    if lower == upper:  # Prevent zero range issues
        lower -= 1e-6
        upper += 1e-6
    
    # If adjustment is enabled, add 5% padding to the range.
    if adjust:
        padding = (upper - lower) * 0.05  # 5% of the range
        lower -= padding
        upper += padding
        
    return {'lower': float(lower), 'upper': float(upper)}

def density_by_patient(data_df: pd.DataFrame, adjust_limits: bool = False) -> dict:
    """
    Generate density estimates for each patient (column) in the dataset.

    Args:
      data_df (pd.DataFrame): A dataframe containing mass spec data. 
                              Each column represents a patient.
      adjust_limits (bool): If True, adds 5% padding to the computed x-axis limits.

    Returns:
      dict: A dictionary structured for frontend visualization.
    """
    numeric_columns = data_df.select_dtypes(include=[np.number]).columns
    if data_df.empty or len(numeric_columns) == 0:
        return {
                "plots": [],
                "limits": {"lower": 0, "upper": 0}
        }
    
    plots = []
    all_values = []

    for patient in numeric_columns:
        values = data_df[patient].dropna().values  # Get values for this patient
        values = values[np.isfinite(values)]  # Remove non-finite values

        if len(values) == 0:
            continue
        
        all_values.extend(values)

        try:
            kernel = stats.gaussian_kde(values)
            x_range = np.linspace(min(values), max(values), 100)
            density = kernel(x_range)
            
            # Calculate area and ensure it's not zero
            area = np.trapz(density, x_range)
            if area == 0:
                area = np.finfo(float).eps  # Use machine epsilon as minimum non-zero value
            
            density = density / area  # Normalize
            
            area_post = np.trapz(density, x_range)
            
            density = np.clip(density, 1e-10, 1e10)

        except Exception as e:
            mean, std = np.mean(values), np.std(values)
            if std == 0:
                std = 1e-6
            x_range = np.linspace(min(values), max(values), 100)
            density = stats.norm.pdf(x_range, mean, std)
            
            area = np.trapz(density, x_range)
            if area == 0:
                area = np.finfo(float).eps
            
            density = density / area
            
            area_post = np.trapz(density, x_range)
            
            density = np.clip(density, 1e-10, 1e10)

        density_data = [{"x": float(x), "y": float(y)} for x, y in zip(x_range, density)]

        plots.append({
            "patient": patient,
            "density": density_data,
            "limits": calculate_limits(values, adjust_limits),
            "raw_data_count": len(values)
        })
    
    return {
            "plots": plots,
            "limits": calculate_limits(all_values, adjust_limits)
    }

def density_by_case(data_df, case_control_labels, adjust_limits=False):
    # Ensure we're only working with numeric data
    numeric_data = data_df.select_dtypes(include=[np.number])
    if len(numeric_data.columns) == 0:
        return {
            'plots': [],
            'limits': {'lower': 0, 'upper': 0}
        }
    
    # Ensure we have enough labels for all numeric columns
    if len(case_control_labels) < len(numeric_data.columns):
        # print(f"Warning: Not enough case/control labels ({len(case_control_labels)}) "
            #   f"for all numeric columns ({len(numeric_data.columns)})")
        # Pad with 'Unknown' if needed
        case_control_labels.extend(['Unknown'] * (len(numeric_data.columns) - len(case_control_labels)))
    
    # Prepare data
    melted_data = []
    for col_idx, col in enumerate(numeric_data.columns):
        for val in numeric_data[col]:
            if pd.notna(val) and np.isfinite(val):
                case = case_control_labels[col_idx] if col_idx < len(case_control_labels) else "Unknown"
                melted_data.append({
                    'value': val,
                    'case_control': case
                })
    
    melted_df = pd.DataFrame(melted_data)
    
    result = {
        'plots': [],
    }
    
    all_values = melted_df['value'].tolist()
    
    for case_type in melted_df['case_control'].unique():
        values = melted_df[melted_df['case_control'] == case_type]['value']
        
        if len(values) == 0:
            continue
            
        # Calculate density with error handling
        try:
            # Add a tiny bit of noise to prevent singular matrix
            values_jitter = values + np.random.normal(0, 1e-10, len(values))
            kernel = stats.gaussian_kde(values_jitter)
            x_range = np.linspace(min(values), max(values), 100)
            density = kernel(x_range)
            # Normalize density: compute area under the curve and divide.
            area = np.trapz(density, x_range)
            if area == 0:
                area = np.finfo(float).eps  # Use machine epsilon as minimum non-zero value
            
            density = density / area  # Normalize first
            
            area_post = np.trapz(density, x_range)
            
            density = np.clip(density, 1e-10, 1e10)

        except Exception as e:
            # If KDE fails, use a simple normal distribution as fallback
            # print(f"KDE failed for case {case_type}: {str(e)}")
            mean, std = np.mean(values), np.std(values)
            if std == 0:  # Handle constant values
                std = 1e-6
            x_range = np.linspace(min(values), max(values), 100)
            density = stats.norm.pdf(x_range, mean, std)
            # Normalize density: compute area under the curve and divide.
            area = np.trapz(density, x_range)
            if area == 0:
                area = np.finfo(float).eps
            
            density = density / area
            
            area_post = np.trapz(density, x_range)
            
            density = np.clip(density, 1e-10, 1e10)
        
        # Format for frontend
        plot_data = {
            'group': case_type,
            'density': [{'x': float(x), 'y': float(y)} for x, y in zip(x_range, density)],
            'limits': calculate_limits(values, adjust_limits),
            'raw_data_count': len(values)
        }
        
        result['plots'].append(plot_data)

    # result = {'byCase': result}
    
    return result

