from io import BytesIO
from unittest.mock import patch

from django.urls import reverse
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import Dataset


def build_raw_csv_file():
    csv_content = (
        "Protein,Sample1,Sample2\n"
        "P1,1,2\n"
        "P2,3,4\n"
        "P3,5,6\n"
    )
    return SimpleUploadedFile("mock_raw.csv", csv_content.encode("utf-8"), content_type="text/csv")


def build_group_txt_file(labels=None):
    if labels is None:
        labels = ["Case", "Control"]
    header = f"{len(labels)} {len(set(labels))} 0\n"
    body = ",".join(labels) + "\n"
    content = header + body
    return SimpleUploadedFile("mock_group.txt", content.encode("utf-8"), content_type="text/plain")


def upload_mock_files(client, dataset_id, labels=None):
    group_url = reverse("group-upload") + f"?dataset_id={dataset_id}"
    raw_url = reverse("raw-upload") + f"?dataset_id={dataset_id}"
    group_resp = client.post(group_url, {"file": build_group_txt_file(labels)}, format="multipart")
    raw_resp = client.post(raw_url, {"file": build_raw_csv_file()}, format="multipart")
    return group_resp, raw_resp


def run_basic_pipeline(client, dataset_id):
    filter_url = reverse("filter") + f"?dataset_id={dataset_id}"
    normal_url = reverse("normal")
    transform_url = reverse("transform")

    filter_resp = client.post(
        filter_url,
        {"filteroption": "percentage", "applyin": "inTotal", "value": 70},
    )
    normal_resp = client.post(normal_url, {"dataset_id": dataset_id, "method": "reference", "reference": "P1"})
    transform_resp = client.post(transform_url, {"dataset_id": dataset_id, "epsilon": 1e-6})
    return filter_resp, normal_resp, transform_resp

class UserAuthTests(APITestCase):
    def setUp(self):
        self.signup_url = reverse('signup')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.user_url = reverse('me')
        self.change_psw_url = reverse('change_password')
        self.update_profile_url = reverse('update_profile')
        self.list_users_url = reverse('list_users')
        self.user_data = {
            "username": "testuser",
            "password": "strongpassword123",
            "email": "test@example.com",
        }
        self.fake_user_data = {
            "username": "fakeuser",
            "password": "randompassword123"
        }

    def test_signup(self):
        response = self.client.post(self.signup_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], self.user_data['username'])

    def test_login_logout(self):
        self.client.post(self.signup_url, self.user_data)
        login_resp = self.client.post(self.login_url, {
            "username": self.user_data['username'],
            "password": self.user_data['password']
        })
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_resp.data)

        token = login_resp.data['token']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

        logout_resp = self.client.post(self.logout_url)
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(logout_resp.data['message'], "Successfully logged out.")
    
    def test_login_fail(self):
        login_resp = self.client.post(self.login_url, {
            "username": self.fake_user_data['username'],
            "password": self.fake_user_data['password']
        })
        self.assertEqual(login_resp.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_current_user(self):
        login_resp = self.client.post(self.signup_url, self.user_data)
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        token = login_resp.data['token']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        
        response = self.client.get(self.user_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_current_user_fail(self):
        response = self.client.get(self.user_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password(self):
        login_resp = self.client.post(self.signup_url, self.user_data)
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        token = login_resp.data['token']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        psw_change = {'old_password': self.user_data['password'], 'new_password': 'abcd1234'}
        response = self.client.post(self.change_psw_url, psw_change)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_profile(self):
        login_resp = self.client.post(self.signup_url, self.user_data)
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        token = login_resp.data['token']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        
        response = self.client.patch(self.update_profile_url, {'email': 'abcd2@gmail.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'abcd2@gmail.com')
        self.assertNotEqual(response.data['email'], self.user_data['email'])

    def test_admin_list_users(self):
        admin_user = User.objects.create_superuser(username='admin', email='admin@example.com', password='adminpass123')
        admin_login = self.client.post(self.login_url, {
            'username': 'admin',
            'password': 'adminpass123'
        })
        self.assertEqual(admin_login.status_code, status.HTTP_200_OK)
        admin_token = admin_login.data['token']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + admin_token)
        
        response = self.client.get(self.list_users_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_fail_list_users(self):
        login_resp = self.client.post(self.signup_url, self.user_data)
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        token = login_resp.data['token']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        response = self.client.get(self.list_users_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class DatasetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='user1', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.login(username='user1', password='pass1234')
        self.dataset_url = reverse('dataset')

    def test_create_dataset(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.dataset_url, {'name': 'test dataset'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get('user'), self.user.id)

    def test_list_datasets(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(self.dataset_url, {'name': 'test dataset'})
        response = self.client.get(self.dataset_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)


class RawDataUploadTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='user2', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='test dataset')
        self.raw_upload_url = reverse('raw-upload') + f'?dataset_id={self.dataset.id}'

    def test_rawdata_upload_no_file(self):
        response = self.client.post(self.raw_upload_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_rawdata_upload_with_file(self):
        response = self.client.post(self.raw_upload_url, {'file': build_raw_csv_file()}, format='multipart')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])


class GroupDataUploadTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='user3', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='test dataset')
        self.group_upload_url = reverse('group-upload') + f'?dataset_id={self.dataset.id}'

    def test_group_upload_no_file(self):
        response = self.client.post(self.group_upload_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_group_upload_with_file(self):
        response = self.client.post(self.group_upload_url, {'file': build_group_txt_file()}, format='multipart')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

class DataTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='datauser', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='test dataset')
        self.data_url = reverse('data') + f'?dataset_id={self.dataset.id}'

    def test_plot_data(self):
        upload_mock_files(self.client, self.dataset.id)
        response = self.client.get(self.data_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('density_patient', response.data)
        self.assertIn('density_case', response.data)

class FilterTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='filteruser', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='test dataset')
        self.filter_url = reverse('filter') + f'?dataset_id={self.dataset.id}'
    
    def test_filter_post_percentage(self):
        upload_mock_files(self.client, self.dataset.id)
        response = self.client.post(self.filter_url, {'filteroption': 'number', 'applyin': 'inTotal', 'value': 70}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_filter_post_number(self):
        upload_mock_files(self.client, self.dataset.id)
        response = self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_get(self):
        upload_mock_files(self.client, self.dataset.id)
        self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70}, format='multipart')

        response = self.client.get(self.filter_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

class NormalizationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='normaluser', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='test dataset')
        self.filter_url = reverse('filter') + f'?dataset_id={self.dataset.id}'
        self.normal_url = reverse('normal')
        upload_mock_files(self.client, self.dataset.id)
        self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70})
        self.client.post(self.normal_url, {'dataset_id': self.dataset.id, 'method': 'reference', 'reference': 'P1'})

    def test_normal_get(self):
        response = self.client.get(reverse('normal') + f'?dataset_id={self.dataset.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.dataset.refresh_from_db()
        normal_output = self.dataset.normal_data.normalize_data
        self.assertTrue(normal_output)
        self.assertIn('data', normal_output)


class TransformationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='normaluser', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='test dataset')
        self.filter_url = reverse('filter') + f'?dataset_id={self.dataset.id}'
        self.normal_url = reverse('normal')
        self.transform_url = reverse('transform')
        upload_mock_files(self.client, self.dataset.id)
        self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70})
        self.client.post(self.normal_url, {'dataset_id': self.dataset.id, 'method': 'reference', 'reference': 'P1'})
        self.client.post(self.transform_url, {'dataset_id': self.dataset.id, 'epsilon': 1e-6})

    def test_transform_get(self):
        response = self.client.get(reverse('transform') + f'?dataset_id={self.dataset.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.dataset.refresh_from_db()
        trans_output = self.dataset.transformed_data.transform_data
        self.assertTrue(trans_output)
        self.assertIn('data', trans_output)


class ImputationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='normaluser', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='test dataset')
        self.filter_url = reverse('filter') + f'?dataset_id={self.dataset.id}'
        self.normal_url = reverse('normal')
        self.transform_url = reverse('transform')
        self.impute_url = reverse('impute') + f'?dataset_id={self.dataset.id}'
        upload_mock_files(self.client, self.dataset.id)
        self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70})
        self.client.post(self.normal_url, {'dataset_id': self.dataset.id, 'method': 'reference', 'reference': 'P1'})
        self.client.post(self.transform_url, {'dataset_id': self.dataset.id, 'epsilon': 1e-6})

    def test_impute_get(self):
        response = self.client.get(self.impute_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dataset.refresh_from_db()
        imp_output = self.dataset.impute_data.impute_data
        self.assertTrue(imp_output)
        self.assertIn('data', imp_output)
    

class AnalysisTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='normaluser', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='analysis dataset')
        upload_mock_files(self.client, self.dataset.id)
        run_basic_pipeline(self.client, self.dataset.id)

    def test_run_ttest_and_get_results(self):
        run_url = reverse('run-ttest')
        results_url = reverse('ttest-results') + f'?dataset_id={self.dataset.id}'

        run_resp = self.client.post(run_url, {'dataset_id': self.dataset.id})
        self.assertEqual(run_resp.status_code, status.HTTP_200_OK)

        results_resp = self.client.get(results_url)
        self.assertEqual(results_resp.status_code, status.HTTP_200_OK)
        self.assertIn('results_data', results_resp.data)

    def test_volcano_and_heatmap_data(self):
        volcano_url = reverse('volcano-plot-data') + f'?dataset_id={self.dataset.id}'
        heatmap_url = reverse('heatmap-data') + f'?dataset_id={self.dataset.id}&top_n=5'

        volcano_resp = self.client.get(volcano_url)
        self.assertEqual(volcano_resp.status_code, status.HTTP_200_OK)
        self.assertIn('thresholds', volcano_resp.data)

        heatmap_resp = self.client.get(heatmap_url)
        self.assertEqual(heatmap_resp.status_code, status.HTTP_200_OK)
        self.assertIn('matrix', heatmap_resp.data)

    def test_cached_analysis_data(self):
        volcano_url = reverse('volcano-plot-data') + f'?dataset_id={self.dataset.id}'
        heatmap_url = reverse('heatmap-data') + f'?dataset_id={self.dataset.id}&top_n=5'
        cache_url = reverse('cached-analysis-data') + f'?dataset_id={self.dataset.id}'

        self.client.get(volcano_url)
        self.client.get(heatmap_url)

        cache_resp = self.client.get(cache_url)
        self.assertEqual(cache_resp.status_code, status.HTTP_200_OK)
        self.assertIn('heatmap', cache_resp.data)
        self.assertIn('volcano', cache_resp.data)

    @patch('app.views.create_density_plot_image', return_value=BytesIO(b'fake'))
    def test_download_patient_graphs(self, _mock_plot):
        download_url = reverse('download-patient-graphs') + f'?dataset_id={self.dataset.id}&data_type=data'
        response = self.client.get(download_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'image/png')

    @patch('app.views.create_density_plot_image', return_value=BytesIO(b'fake'))
    def test_download_case_graphs(self, _mock_plot):
        download_url = reverse('download-case-graphs') + f'?dataset_id={self.dataset.id}&data_type=data'
        response = self.client.get(download_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'image/png')

    @patch('app.utils.graph_export.create_volcano_plot_image', return_value=BytesIO(b'fake'))
    def test_download_volcano_plot(self, _mock_plot):
        download_url = reverse('download-volcano-plot') + f'?dataset_id={self.dataset.id}'
        response = self.client.get(download_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'image/png')

    @patch('app.utils.graph_export.create_clustered_heatmap_image', return_value=BytesIO(b'fake'))
    def test_download_heatmap(self, _mock_plot):
        download_url = reverse('download-heatmap') + f'?dataset_id={self.dataset.id}&top_n=5'
        response = self.client.get(download_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'image/png')


class MiscEndpointsTests(APITestCase):
    def test_root_and_health(self):
        root_resp = self.client.get(reverse('root'))
        health_resp = self.client.get(reverse('health_check'))

        self.assertEqual(root_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(health_resp.status_code, status.HTTP_200_OK)

