from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from . views import *

urlpatterns = [
    path('', root, name="root"),
    path('api/health', health_check, name='health_check'),
    path('api/login', login, name='login'),
    path('api/signup', signup, name='signup'),
    path('api/logout', logout, name='logout'),
    path('api/update-profile', update_profile, name='update_profile'),
    path('api/change-password', change_password, name='change_password'),
    path('api/me', get_current_user, name='me'),
    path('api/admin/users', list_users, name='list_users'),
    path('api/dataset', DatasetView.as_view(), name='dataset'),
    path('api/upload/rawdata', RawDataUploadView.as_view(), name='raw-upload'),
    path('api/upload/group', GroupDataUploadView.as_view(), name='group-upload'),
    path('api/data', DataView.as_view(), name='data'),
    path('api/filter', FilterView.as_view(), name='filter'),
    path('api/normal', NormalView.as_view(), name='normal'),
    path('api/transform', TransformView.as_view(), name='transform'),
    path('api/impute', ImputationView.as_view(), name='impute'),
    path('api/volcano-plot-data', get_volcano_plot_data, name='volcano-plot-data'),
    path('api/heatmap-data', get_heatmap_data, name='heatmap-data'),
    path('api/run-ttest', run_ttest_analysis, name='run-ttest'),
    path('api/ttest-results', TtestResultsView.as_view(), name='ttest-results'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)