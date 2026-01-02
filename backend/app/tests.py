from django.urls import reverse
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import *

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
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

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
        self.assertEqual(response.data['user'], self.user.id if 'user' in response.data else None)

    def test_list_datasets(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(self.dataset_url)
        response = self.client.get(self.dataset_url, {'name': 'test dataset'})
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
        file_path = os.path.join(os.path.dirname(__file__), 'testing_files', 'Spectrometer_Data_Copy.csv')
        
        with open(file_path, 'rb') as f:
            file = SimpleUploadedFile('Spectrometer_Data_Copy.csv', f.read(), content_type='text/csv')

        response = self.client.post(self.raw_upload_url, {'file': file}, format='multipart')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
    
    def test_rawdata_multi_upload_replaces_file(self):
        file_path = os.path.join(os.path.dirname(__file__), 'testing_files', 'Spectrometer_Data_Copy.csv')

        with open(file_path, 'rb') as f:
            file1 = SimpleUploadedFile('SpectrometerDataFile1.csv', f.read(), content_type='text/csv')
            response = self.client.post(self.raw_upload_url, {'file': file1}, format='multipart')
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        self.dataset.refresh_from_db()
        first_file_path = self.dataset.raw_file.spec_data_file.path

        with open(file_path, 'rb') as f:
            file2 = SimpleUploadedFile('SpectrometerDataFile2.csv', f.read(), content_type='text/csv')
            response = self.client.post(self.raw_upload_url, {'file': file2}, format='multipart')
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        self.dataset.refresh_from_db()
        second_file_path = self.dataset.raw_file.spec_data_file.path

        self.assertNotEqual(first_file_path, second_file_path)
        self.assertFalse(os.path.exists(first_file_path))  # Ensure first file is deleted
        self.assertTrue(os.path.exists(second_file_path))


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
        file_path = os.path.join(os.path.dirname(__file__), 'testing_files', 'grouping_file.txt')
        
        with open(file_path, 'rb') as f:
            file = SimpleUploadedFile('grouping_file.txt', f.read(), content_type='text/csv')

        response = self.client.post(self.group_upload_url, {'file': file}, format='multipart')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
    
    def test_group_multi_upload_replaces_file(self):
        file_path = os.path.join(os.path.dirname(__file__), 'testing_files', 'grouping_file.txt')

        with open(file_path, 'rb') as f:
            file1 = SimpleUploadedFile('grouping_file1.txt', f.read(), content_type='text/csv')
            response = self.client.post(self.group_upload_url, {'file': file1}, format='multipart')
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        self.dataset.refresh_from_db()
        first_file_path = self.dataset.group_file.group_data_file.path

        with open(file_path, 'rb') as f:
            file2 = SimpleUploadedFile('grouping_file2.txt', f.read(), content_type='text/csv')
            response = self.client.post(self.group_upload_url, {'file': file2}, format='multipart')
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        self.dataset.refresh_from_db()
        second_file_path = self.dataset.group_file.group_data_file.path

        self.assertNotEqual(first_file_path, second_file_path)
        self.assertFalse(os.path.exists(first_file_path))  # Ensure first file is deleted
        self.assertTrue(os.path.exists(second_file_path))


def completeFileUploads(client, dataset_id):
    group_upload_url = reverse('group-upload') + f'?dataset_id={dataset_id}'
    raw_upload_url = reverse('raw-upload') + f'?dataset_id={dataset_id}'
    
    group_file_path = os.path.join(os.path.dirname(__file__), 'testing_files', 'grouping_file.txt')
    with open(group_file_path, 'rb') as f:
        group_file = SimpleUploadedFile('grouping_file.txt', f.read(), content_type='text/csv')
    client.post(group_upload_url, {'file': group_file}, format='multipart')

    raw_file_path = os.path.join(os.path.dirname(__file__), 'testing_files', 'Spectrometer_Data_Copy.csv')
    with open(raw_file_path, 'rb') as f:
        raw_file = SimpleUploadedFile('SpectrometerDataCopy.csv', f.read(), content_type='text/csv')
    client.post(raw_upload_url, {'file': raw_file}, format='multipart')

class DataTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='datauser', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='test dataset')
        self.data_url = reverse('data') + f'?dataset_id={self.dataset.id}'

    def test_plot_data(self):
        completeFileUploads(self.client, self.dataset.id)
        response = self.client.get(self.data_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

class FilterTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='filteruser', password='pass1234', email="abcd@gmail.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(user=self.user, name='test dataset')
        self.filter_url = reverse('filter') + f'?dataset_id={self.dataset.id}'
    
    def test_filter_post_percentage(self):
        completeFileUploads(self.client, self.dataset.id)
        response = self.client.post(self.filter_url, {'filteroption': 'number', 'applyin': 'inTotal', 'value': 70}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_filter_post_number(self):
        completeFileUploads(self.client, self.dataset.id)
        response = self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_update(self):
        completeFileUploads(self.client, self.dataset.id)
        response = self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.dataset.refresh_from_db()
        filter_output1 = self.dataset.filtered_data.filtered_data

        completeFileUploads(self.client, self.dataset.id)
        response = self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 60}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.dataset.refresh_from_db()
        filter_output2 = self.dataset.filtered_data.filtered_data

        self.assertNotEqual(filter_output1, filter_output2)

    def test_filter_get(self):
        completeFileUploads(self.client, self.dataset.id)
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
        self.normal_url = reverse('normal') + f'?dataset_id={self.dataset.id}&reference_entry=iRT-Kit_WR_fusion'
        completeFileUploads(self.client, self.dataset.id)
        self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70}, format='multipart')
        self.client.post(self.normal_url)

    def test_normal_get(self):
        response = self.client.get(self.normal_url)
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
        self.normal_url = reverse('normal') + f'?dataset_id={self.dataset.id}&reference_entry=iRT-Kit_WR_fusion'
        self.transform_url = reverse('transform') + f'?dataset_id={self.dataset.id}'
        completeFileUploads(self.client, self.dataset.id)
        self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70}, format='multipart')
        self.client.post(self.normal_url)

    def test_transform_get(self):
        response = self.client.get(self.transform_url)
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
        self.impute_url = reverse('impute') + f'?dataset_id={self.dataset.id}'
        completeFileUploads(self.client, self.dataset.id)
        self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70}, format='multipart')

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
        self.dataset = Dataset.objects.create(user=self.user)
        self.filter_url = reverse('filter') + f'?dataset_id={self.dataset.id}'
        self.analysis_url = reverse('analysis') + f'?dataset_id={self.dataset.id}'
        completeFileUploads(self.client, self.dataset.id)
        self.client.post(self.filter_url, {'filteroption': 'percentage', 'applyin': 'inTotal', 'value': 70}, format='multipart')
    
    def test_get_analysis(self):
        response = self.client.get(self.analysis_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        output = response.data

        self.assertIn('results', output)
        self.assertIn('volcano', output)
        self.assertIn('heatmap', output)
        self.assertIn('volcano_data', output['volcano'])
        self.assertIn('thresholds', output['volcano'])
        self.assertIn('matrix', output['heatmap'])
        self.assertIn('row_labels', output['heatmap'])
        self.assertIn('column_labels', output['heatmap'])
        self.assertIn('group_labels', output['heatmap'])

