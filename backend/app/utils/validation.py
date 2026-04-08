import os
from django.core.exceptions import ValidationError

def validate_rawdata_file_extension(value):
    #Ensure uploaded file is either csv or xlsx
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in ['.csv', '.xlsx']: 
        raise ValidationError("Unsupported file extension. Allowed: .csv, .xlsx")

def validate_group_file_extension(value):
    #Ensure uploaded file is either csv or xlsx
    ext = os.path.splitext(value.name)[1].lower()

    if ext not in ['.txt', '.csv']:
        raise ValidationError("Unsupported file extension. Allowed: .txt")

def validate_group_file_content(value):
    # Read the content of the uploaded file
    try:
        content = value.read().decode('utf-8').strip().split('\n')
    except Exception as e:
        raise ValidationError("Invalid file format.")

    if not content:
        raise ValidationError("File is empty.")

    # Extract expected values from the first line (handle space or comma-separated formats)
    first_line = content[0]
    delimiter = ',' if ',' in first_line else ' '  # Check if commas exist in the first line
    try:
        expected_word_count, expected_unique_count, _ = map(int, first_line.split(delimiter))
    except ValueError:
        raise ValidationError("Invalid header format. Expected format: '<int><delimiter><int><delimiter><int>'.")

    # Extract words from the second line (always comma-separated)
    words = content[1].split(',')
    words = [word.strip() for word in words if word.strip()]  # Clean up spaces

    # Validate word count
    if len(words) != expected_word_count:
        raise ValidationError(f"Word count mismatch. Expected {expected_word_count}, found {len(words)}.")

    # Validate unique values count
    unique_values = set(words)
    if len(unique_values) != expected_unique_count:
        raise ValidationError(
            f"Unique value count mismatch. Expected {expected_unique_count}, found {len(unique_values)}.")