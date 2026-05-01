"""
Utility functions for exporting density plots as images.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.colors import LinearSegmentedColormap
import numpy as np
from io import BytesIO
from PIL import Image
import math


def truncate_name(name, max_length=25):
    """
    Truncate a name to a maximum length with ellipsis.
    
    Args:
        name: The name string to truncate
        max_length: Maximum length before truncation (default: 25)
    
    Returns:
        Truncated name with ellipsis if needed
    """
    if len(str(name)) > max_length:
        return str(name)[:max_length - 3] + '...'
    return str(name)


def get_heatmap_cmap():
    """Return a colormap that matches the frontend heatmap colors."""
    return LinearSegmentedColormap.from_list(
        "frontend_vlag",
        ["#8B0000", "#FF6B6B", "#FFFFFF", "#87CEEB", "#00008B"],
    )


def get_heatmap_vrange(values: np.ndarray):
    """Compute symmetric vmin/vmax using the 99.5th percentile of abs values."""
    finite = values[np.isfinite(values)]
    if finite.size == 0:
        return -1.0, 1.0
    abs_values = np.abs(finite)
    percentile_idx = int(np.ceil(len(abs_values) * 0.995)) - 1
    vmax = abs_values[np.argsort(abs_values)[percentile_idx]] if percentile_idx >= 0 else 1.0
    vmax = float(max(vmax, 1e-6))
    return -vmax, vmax


def create_density_plot_image(plots_data, title="Distribution Plots", plots_per_row=3):
    """
    Create a composite image of multiple density plots.
    
    Args:
        plots_data: List of plot dictionaries with 'patient'/'group', 'density', and 'limits'
        title: Title for the overall image
        plots_per_row: Number of plots per row in the grid
    
    Returns:
        BytesIO object containing the PNG image
    """
    if not plots_data:
        # Create an empty figure with a message
        fig, ax = plt.subplots(figsize=(10, 6), dpi=100)
        ax.text(0.5, 0.5, 'No data to display', 
                ha='center', va='center', fontsize=16, color='gray')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        
        img_buffer = BytesIO()
        fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
        img_buffer.seek(0)
        plt.close(fig)
        return img_buffer
    
    # Calculate grid dimensions
    num_plots = len(plots_data)
    num_rows = math.ceil(num_plots / plots_per_row)
    
    # Create figure with subplots
    fig, axes = plt.subplots(num_rows, plots_per_row, figsize=(15, 5 * num_rows), dpi=100)
    fig.suptitle(title, fontsize=16, fontweight='bold', y=0.995)
    
    # Flatten axes array for easier iteration
    if num_plots == 1:
        axes = np.array([axes]) if not isinstance(axes, np.ndarray) else axes.flatten()
    elif num_rows == 1:
        axes = axes.flatten()
    else:
        axes = axes.flatten()
    
    # Plot each density plot
    colors = plt.cm.tab20(np.linspace(0, 1, max(num_plots, 2)))
    
    for idx, plot_data in enumerate(plots_data):
        ax = axes[idx]
        
        # Extract data
        density_points = plot_data.get('density', [])
        plot_label = plot_data.get('patient') or plot_data.get('group', f'Plot {idx + 1}')
        # Truncate label to prevent overflow
        plot_label_truncated = truncate_name(plot_label, max_length=25)
        
        if density_points:
            x_vals = [point['x'] for point in density_points]
            y_vals = [point['y'] for point in density_points]
            
            # Plot the density curve
            color = colors[idx % len(colors)]
            ax.plot(x_vals, y_vals, color=color, linewidth=2, label=plot_label_truncated)
            ax.fill_between(x_vals, y_vals, alpha=0.3, color=color)
        
        # Set labels and title
        ax.set_xlabel('Value', fontsize=10)
        ax.set_ylabel('Density', fontsize=10)
        ax.set_title(plot_label_truncated, fontsize=12, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.legend(loc='upper right', fontsize=8)
    
    # Hide unused subplots
    for idx in range(num_plots, len(axes)):
        axes[idx].axis('off')
    
    # Adjust layout to prevent overlap
    plt.tight_layout()
    
    # Save to BytesIO buffer
    img_buffer = BytesIO()
    fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
    img_buffer.seek(0)
    plt.close(fig)
    
    return img_buffer


def combine_density_images(patient_plots, case_plots, title="Distribution Summary"):
    """
    Combine patient and case plots into a single image with two sections.
    
    Args:
        patient_plots: List of patient plot dictionaries
        case_plots: List of case/control plot dictionaries
        title: Title for the overall image
    
    Returns:
        BytesIO object containing the PNG image
    """
    # Generate individual plot images
    patient_buffer = create_density_plot_image(patient_plots, "Distribution by Patient")
    patient_img = Image.open(patient_buffer)
    
    case_buffer = create_density_plot_image(case_plots, "Distribution by Case/Control")
    case_img = Image.open(case_buffer)
    
    # Calculate dimensions for combined image
    max_width = max(patient_img.width, case_img.width)
    total_height = patient_img.height + case_img.height + 40  # Add spacing
    
    # Create new image
    combined_img = Image.new('RGB', (max_width, total_height), color='white')
    
    # Paste images
    combined_img.paste(patient_img, (0, 0))
    combined_img.paste(case_img, (0, patient_img.height + 40))
    
    # Save to buffer
    img_buffer = BytesIO()
    combined_img.save(img_buffer, format='png')
    img_buffer.seek(0)
    
    return img_buffer


def create_volcano_plot_image(volcano_data, thresholds=None, title="Volcano Plot", contrast_label="",
                              fc_threshold_override=None, neg_log_p_threshold_override=None):
    """
    Create a volcano plot image from volcano data.

    Args:
        volcano_data: List of dictionaries with 'logFC', 'neg_log10_p_value', 'Protein', and 'log2FC' keys
        thresholds: Optional dictionary with 'log2fc' and 'qval' keys
        title: Title for the plot
        contrast_label: Optional contrast label for multi-group comparisons
        fc_threshold_override: If provided, use this directly as the log2FC threshold instead of thresholds['log2fc']
        neg_log_p_threshold_override: If provided, use this directly as the -log10(p) threshold instead of computing from qval

    Returns:
        BytesIO object containing the PNG image
    """
    if not volcano_data or len(volcano_data) == 0:
        # Create an empty figure with a message
        fig, ax = plt.subplots(figsize=(12, 8), dpi=100)
        ax.text(0.5, 0.5, 'No volcano data to display', 
                ha='center', va='center', fontsize=16, color='gray')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        
        img_buffer = BytesIO()
        fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
        img_buffer.seek(0)
        plt.close(fig)
        return img_buffer
    
    # Set default thresholds
    if thresholds is None:
        thresholds = {'log2fc': 0.58, 'qval': 0.05}

    log2fc_threshold = thresholds.get('log2fc', 0.58) if fc_threshold_override is None else fc_threshold_override
    qval_threshold = thresholds.get('qval', 0.05)
    
    # Extract data
    logfc_values = []
    neg_log_p_values = []
    protein_names = []
    
    for point in volcano_data:
        # Try different column names for fold change
        fc = point.get('log2FC') or point.get('logFC') or 0
        neg_p = point.get('neg_log10_p_value') or point.get('negLogP') or 0
        protein = point.get('Protein') or point.get('label') or 'Unknown'
        
        logfc_values.append(float(fc) if fc else 0)
        neg_log_p_values.append(float(neg_p) if neg_p else 0)
        protein_names.append(str(protein))
    
    logfc_values = np.array(logfc_values)
    neg_log_p_values = np.array(neg_log_p_values)
    
    # Determine point colors based on significance
    # Use frontend override if provided, otherwise convert qval to -log10(p-value)
    if neg_log_p_threshold_override is not None:
        neg_log_p_threshold = neg_log_p_threshold_override
    else:
        neg_log_p_threshold = -np.log10(qval_threshold) if qval_threshold > 0 else 1.3
    
    colors = []
    for fc, p in zip(logfc_values, neg_log_p_values):
        if abs(fc) > log2fc_threshold and p > neg_log_p_threshold:
            colors.append('red' if fc > 0 else 'blue')
        else:
            colors.append('lightgray')
    
    # Create figure
    fig, ax = plt.subplots(figsize=(12, 8), dpi=100)
    
    # Plot points
    scatter = ax.scatter(logfc_values, neg_log_p_values, c=colors, alpha=0.6, s=50, edgecolors='none')
    
    # Add threshold lines (only when non-zero — 0 means no threshold set)
    if log2fc_threshold != 0:
        ax.axvline(x=log2fc_threshold, color='gray', linestyle='--', linewidth=1.5, alpha=0.7, label=f'Log2FC = ±{log2fc_threshold}')
        ax.axvline(x=-log2fc_threshold, color='gray', linestyle='--', linewidth=1.5, alpha=0.7)
    if neg_log_p_threshold != 0:
        ax.axhline(y=neg_log_p_threshold, color='gray', linestyle='--', linewidth=1.5, alpha=0.7, label=f'-Log10(p-value) = {neg_log_p_threshold:.2f}')
    
    # Labels and title
    ax.set_xlabel('Log2 Fold Change', fontsize=12, fontweight='bold')
    ax.set_ylabel('-Log10(p-value)', fontsize=12, fontweight='bold')
    
    plot_title = title
    if contrast_label:
        plot_title = f"{title}: {contrast_label}"
    ax.set_title(truncate_name(plot_title, max_length=60), fontsize=14, fontweight='bold')
    
    # Add legend
    red_patch = mpatches.Patch(color='red', label='Up-regulated')
    blue_patch = mpatches.Patch(color='blue', label='Down-regulated')
    gray_patch = mpatches.Patch(color='lightgray', label='Not significant')
    ax.legend(handles=[red_patch, blue_patch, gray_patch], loc='upper right', fontsize=10)
    
    ax.grid(True, alpha=0.3)
    
    # Save to BytesIO buffer
    img_buffer = BytesIO()
    fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
    img_buffer.seek(0)
    plt.close(fig)
    
    return img_buffer


def create_heatmap_image(matrix, row_labels=None, column_labels=None, col_group_labels=None, 
                        title="Clustered Heatmap", figsize=(14, 10)):
    """
    Create a heatmap image from matrix data.
    
    Args:
        matrix: 2D numpy array or list of lists
        row_labels: List of row labels (protein names)
        column_labels: List of column labels (sample names)
        col_group_labels: List of group labels for columns (case/control)
        title: Title for the heatmap
        figsize: Tuple of (width, height) for figure size
    
    Returns:
        BytesIO object containing the PNG image
    """
    if matrix is None or len(matrix) == 0:
        # Create an empty figure with a message
        fig, ax = plt.subplots(figsize=figsize, dpi=100)
        ax.text(0.5, 0.5, 'No heatmap data to display', 
                ha='center', va='center', fontsize=16, color='gray')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        
        img_buffer = BytesIO()
        fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
        img_buffer.seek(0)
        plt.close(fig)
        return img_buffer
    
    # Convert to numpy array if needed
    if isinstance(matrix, list):
        matrix = np.array(matrix)
    
    num_rows, num_cols = matrix.shape
    
    # Set default labels if not provided
    if row_labels is None:
        row_labels = [f'Protein {i+1}' for i in range(num_rows)]
    if column_labels is None:
        column_labels = [f'Sample {i+1}' for i in range(num_cols)]
    
    # Truncate labels
    row_labels_trunc = [truncate_name(label, max_length=20) for label in row_labels]
    col_labels_trunc = [truncate_name(label, max_length=15) for label in column_labels]
    
    # Calculate figure height based on number of rows
    height = max(10, num_rows * 0.3)
    fig, ax = plt.subplots(figsize=(14, height), dpi=100)
    
    vmin, vmax = get_heatmap_vrange(matrix)
    cmap = get_heatmap_cmap()

    # Create heatmap
    im = ax.imshow(matrix, cmap=cmap, vmin=vmin, vmax=vmax, aspect='auto')
    
    # Set ticks and labels
    ax.set_xticks(np.arange(num_cols))
    ax.set_yticks(np.arange(num_rows))
    ax.set_xticklabels(col_labels_trunc, rotation=45, ha='right', fontsize=9)
    ax.set_yticklabels(row_labels_trunc, fontsize=9)
    
    # Add group labels above columns if provided
    if col_group_labels and len(col_group_labels) == num_cols:
        # Get unique groups and their positions
        group_positions = {}
        for idx, group in enumerate(col_group_labels):
            if group not in group_positions:
                group_positions[group] = []
            group_positions[group].append(idx)
        
        # Add group label rectangles
        for group, positions in group_positions.items():
            min_pos = min(positions) - 0.5
            max_pos = max(positions) + 0.5
            ax.add_patch(plt.Rectangle((min_pos, -0.7), max_pos - min_pos, 0.5, 
                                      fill=True, edgecolor='black', linewidth=1.5, 
                                      facecolor='lightgray', zorder=5))
            mid_pos = (min_pos + max_pos) / 2
            ax.text(mid_pos, -0.45, group, ha='center', va='center', fontsize=8, fontweight='bold')
    
    # Add colorbar
    cbar = plt.colorbar(im, ax=ax)
    cbar.set_label('Expression Level', fontsize=10)
    
    # Labels and title
    ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
    ax.set_xlabel('Samples', fontsize=11, fontweight='bold')
    ax.set_ylabel('Proteins', fontsize=11, fontweight='bold')
    
    # Add grid
    ax.set_xticks(np.arange(num_cols)-.5, minor=True)
    ax.set_yticks(np.arange(num_rows)-.5, minor=True)
    ax.grid(which='minor', color='gray', linestyle='-', linewidth=0.5, alpha=0.3)
    
    plt.tight_layout()
    
    # Save to BytesIO buffer
    img_buffer = BytesIO()
    fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
    img_buffer.seek(0)
    plt.close(fig)
    
    return img_buffer


def create_clustered_heatmap_image(matrix, row_labels=None, column_labels=None, col_group_labels=None, 
                                   row_linkage=None, col_linkage=None, title="Clustered Heatmap", 
                                   figsize=(16, 12), row_cluster: bool = True, col_cluster: bool = True):
    """
    Create a clustered heatmap image with dendrograms using seaborn's clustermap.
    Uses the 'vlag' diverging colormap to match the interactive frontend visualization.
    
    Args:
        matrix: 2D numpy array, DataFrame, or list of lists (expression matrix)
        row_labels: List of row labels (protein names)
        column_labels: List of column labels (sample names)
        col_group_labels: List of group labels for columns (case/control)
        row_linkage: Linkage matrix for row dendrogram (from scipy.cluster.hierarchy.linkage)
        col_linkage: Linkage matrix for column dendrogram (from scipy.cluster.hierarchy.linkage)
        title: Title for the heatmap
        figsize: Tuple of (width, height) for figure size
        row_cluster: Whether to cluster rows (default: True)
        col_cluster: Whether to cluster columns (default: True)
    
    Returns:
        BytesIO object containing the PNG image
    """
    import pandas as pd
    import seaborn as sns
    from scipy.spatial.distance import pdist
    from scipy.cluster.hierarchy import linkage, dendrogram
    
    if matrix is None or len(matrix) == 0:
        # Create an empty figure with a message
        fig, ax = plt.subplots(figsize=figsize, dpi=100)
        ax.text(0.5, 0.5, 'No heatmap data to display', 
                ha='center', va='center', fontsize=16, color='gray')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        
        img_buffer = BytesIO()
        fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
        img_buffer.seek(0)
        plt.close(fig)
        return img_buffer
    
    # Convert to DataFrame for seaborn compatibility
    if not isinstance(matrix, pd.DataFrame):
        matrix_df = pd.DataFrame(matrix)
    else:
        matrix_df = matrix.copy()
    
    num_rows, num_cols = matrix_df.shape
    
    # Set default labels if not provided
    if row_labels is None:
        row_labels = [f'Protein {i+1}' for i in range(num_rows)]
    if column_labels is None:
        column_labels = [f'Sample {i+1}' for i in range(num_cols)]
    
    # Truncate labels
    row_labels_trunc = [truncate_name(label, max_length=20) for label in row_labels]
    col_labels_trunc = [truncate_name(label, max_length=15) for label in column_labels]
    
    # Set index and columns
    matrix_df.index = row_labels_trunc
    matrix_df.columns = col_labels_trunc
    
    # Calculate symmetric color scale based on 99.5th percentile (matching frontend logic)
    vmin, vmax = get_heatmap_vrange(matrix_df.values)
    cmap = get_heatmap_cmap()
    
    # Create clustermap with dendrograms
    try:
        g = sns.clustermap(
            matrix_df,
            cmap=cmap,
            center=0,
            vmin=vmin,
            vmax=vmax,
            method='average',  # linkage method
            metric='correlation',  # distance metric
            row_linkage=row_linkage,  # use precomputed linkage if available
            col_linkage=col_linkage,  # use precomputed linkage if available
            row_cluster=row_cluster,
            col_cluster=col_cluster,
            figsize=figsize,
            cbar_kws={'label': 'Expression Level (z-score)'},
            linewidths=0.5,
            linecolor='gray',
            yticklabels=True,
            xticklabels=True,
        )
        
        # Customize appearance
        g.ax_heatmap.set_title(title, fontsize=14, fontweight='bold', pad=20)
        g.ax_heatmap.set_xlabel('Samples', fontsize=12, fontweight='bold')
        g.ax_heatmap.set_ylabel('Proteins', fontsize=12, fontweight='bold')
        
        # Rotate x-axis labels for readability
        g.ax_heatmap.set_xticklabels(g.ax_heatmap.get_xticklabels(), rotation=45, ha='right', fontsize=9)
        g.ax_heatmap.set_yticklabels(g.ax_heatmap.get_yticklabels(), fontsize=9)
        
        # Add group color bar if provided
        if col_group_labels and len(col_group_labels) == num_cols:
            # Define Set2 palette colors (matching frontend)
            SET2_PALETTE = [
                "#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3",
                "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"
            ]
            
            # Create group to color mapping
            unique_groups = list(dict.fromkeys(col_group_labels))
            group_colors = {}
            for idx, group in enumerate(unique_groups):
                group_colors[group] = SET2_PALETTE[idx % len(SET2_PALETTE)]
            
            # Get the reordered column indices from clustermap if clustering is enabled
            if col_cluster and getattr(g, 'dendrogram_col', None) is not None:
                col_order_idx = g.dendrogram_col.reordered_ind
                reordered_groups = [col_group_labels[i] for i in col_order_idx]
            else:
                reordered_groups = col_group_labels
            
            # Create color bar below the heatmap
            group_colors_list = [group_colors[grp] for grp in reordered_groups]
            
            # Add the group color bar
            ax_cbar = g.ax_heatmap
            cbar_height = 0.02
            cbar_bottom = ax_cbar.get_position().y0 - 0.05
            cbar_ax = g.fig.add_axes([ax_cbar.get_position().x0, cbar_bottom, 
                                     ax_cbar.get_position().width, cbar_height])
            
            for i, color in enumerate(group_colors_list):
                cbar_ax.add_patch(plt.Rectangle((i, 0), 1, 1, facecolor=color, edgecolor='black', linewidth=1))
            
            cbar_ax.set_xlim(0, len(group_colors_list))
            cbar_ax.set_ylim(0, 1)
            cbar_ax.set_xticks([])
            cbar_ax.set_yticks([])
            cbar_ax.set_ylabel('Group', fontsize=10, fontweight='bold')
        
        plt.tight_layout()
        
        # Save to BytesIO buffer
        img_buffer = BytesIO()
        g.fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
        img_buffer.seek(0)
        plt.close(g.fig)
        
        return img_buffer
    
    except Exception as e:
        # Fallback to simple heatmap if clustermap fails
        print(f"Clustermap creation failed: {str(e)}. Falling back to simple heatmap.")
        return create_heatmap_image(matrix, row_labels, column_labels, col_group_labels, title)
