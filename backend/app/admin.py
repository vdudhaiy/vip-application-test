from django.contrib import admin
from .models import *

# Register your models here.
admin.register(User)
admin.site.register(RawDataUpload)
admin.site.register(GroupDataUpload)
admin.site.register(FilterData)
admin.site.register(NormalizedData)
admin.site.register(TransformedData)
admin.site.register(ImputeData)
admin.site.register(Dataset)
