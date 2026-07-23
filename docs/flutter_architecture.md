# Flutter Architecture Design - VEGA Mobile App

## 1. Project Structure

```
vega_app/
│
├── lib/
│   ├── core/
│   │   ├── constants/
│   │   │   ├── api_constants.dart
│   │   │   ├── app_constants.dart
│   │   │   ├── string_constants.dart
│   │   │   └── color_constants.dart
│   │   │
│   │   ├── themes/
│   │   │   ├── app_theme.dart
│   │   │   ├── colors.dart
│   │   │   └── text_styles.dart
│   │   │
│   │   ├── network/
│   │   │   ├── api_client.dart
│   │   │   ├── http_interceptor.dart
│   │   │   ├── network_exceptions.dart
│   │   │   └── network_util.dart
│   │   │
│   │   ├── routes/
│   │   │   ├── route_names.dart
│   │   │   ├── routes.dart
│   │   │   └── route_observer.dart
│   │   │
│   │   ├── utils/
│   │   │   ├── validators.dart
│   │   │   ├── extensions.dart
│   │   │   ├── app_utils.dart
│   │   │   └── secure_storage.dart
│   │   │
│   │   └── widgets/
│   │       ├── loading_widget.dart
│   │       ├── error_widget.dart
│   │       ├── empty_state_widget.dart
│   │       └── custom_button.dart
│   │
│   ├── data/
│   │   ├── models/
│   │   │   ├── auth/
│   │   │   │   ├── user_model.dart
│   │   │   │   ├── login_request.dart
│   │   │   │   ├── login_response.dart
│   │   │   │   ├── register_request.dart
│   │   │   │   └── auth_response.dart
│   │   │   │
│   │   │   ├── profile/
│   │   │   │   ├── student_profile_model.dart
│   │   │   │   ├── company_profile_model.dart
│   │   │   │   ├── education_model.dart
│   │   │   │   ├── experience_model.dart
│   │   │   │   ├── project_model.dart
│   │   │   │   ├── skill_model.dart
│   │   │   │   └── certification_model.dart
│   │   │   │
│   │   │   ├── jobs/
│   │   │   │   ├── job_model.dart
│   │   │   │   ├── job_details_model.dart
│   │   │   │   ├── job_application_model.dart
│   │   │   │   ├── job_stage_model.dart
│   │   │   │   └── test_submission_model.dart
│   │   │   │
│   │   │   ├── ai/
│   │   │   │   ├── interview_history_model.dart
│   │   │   │   ├── interview_feedback_model.dart
│   │   │   │   └── resume_builder_model.dart
│   │   │   │
│   │   │   ├── assessment/
│   │   │   │   ├── psychometric_model.dart
│   │   │   │   ├── quiz_model.dart
│   │   │   │   ├── intelligence_test_model.dart
│   │   │   │   └── test_result_model.dart
│   │   │   │
│   │   │   ├── gamification/
│   │   │   │   ├── xp_transaction_model.dart
│   │   │   │   ├── xp_package_model.dart
│   │   │   │   ├── referral_model.dart
│   │   │   │   ├── payment_model.dart
│   │   │   │   └── leaderboard_model.dart
│   │   │   │
│   │   │   └── common/
│   │   │       ├── api_response.dart
│   │   │       ├── pagination_model.dart
│   │   │       └── error_response.dart
│   │   │
│   │   ├── repositories/
│   │   │   ├── auth_repository.dart
│   │   │   ├── student_profile_repository.dart
│   │   │   ├── company_profile_repository.dart
│   │   │   ├── job_repository.dart
│   │   │   ├── interview_repository.dart
│   │   │   ├── assessment_repository.dart
│   │   │   ├── xp_repository.dart
│   │   │   ├── analytics_repository.dart
│   │   │   └── community_repository.dart
│   │   │
│   │   └── services/
│   │       ├── local_storage_service.dart
│   │       ├── secure_storage_service.dart
│   │       ├── notification_service.dart
│   │       └── permission_service.dart
│   │
│   ├── viewmodels/
│   │   ├── auth/
│   │   │   ├── login_viewmodel.dart
│   │   │   ├── register_viewmodel.dart
│   │   │   ├── verify_email_viewmodel.dart
│   │   │   ├── password_reset_viewmodel.dart
│   │   │   ├── auth_state.dart
│   │   │   └── auth_provider.dart
│   │   │
│   │   ├── profile/
│   │   │   ├── student_profile_viewmodel.dart
│   │   │   ├── company_profile_viewmodel.dart
│   │   │   ├── profile_edit_viewmodel.dart
│   │   │   └── profile_state.dart
│   │   │
│   │   ├── dashboard/
│   │   │   ├── student_dashboard_viewmodel.dart
│   │   │   ├── company_dashboard_viewmodel.dart
│   │   │   └── dashboard_state.dart
│   │   │
│   │   ├── jobs/
│   │   │   ├── job_list_viewmodel.dart
│   │   │   ├── job_details_viewmodel.dart
│   │   │   ├── job_application_viewmodel.dart
│   │   │   └── job_state.dart
│   │   │
│   │   ├── ai/
│   │   │   ├── interview_viewmodel.dart
│   │   │   ├── resume_builder_viewmodel.dart
│   │   │   ├── ai_chat_viewmodel.dart
│   │   │   └── ai_state.dart
│   │   │
│   │   ├── assessment/
│   │   │   ├── psychometric_viewmodel.dart
│   │   │   ├── quiz_viewmodel.dart
│   │   │   ├── intelligence_test_viewmodel.dart
│   │   │   └── assessment_state.dart
│   │   │
│   │   ├── gamification/
│   │   │   ├── xp_viewmodel.dart
│   │   │   ├── leaderboard_viewmodel.dart
│   │   │   └── gamification_state.dart
│   │   │
│   │   └── app_viewmodel.dart
│   │
│   ├── views/
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   ├── register_screen.dart
│   │   │   ├── verify_email_screen.dart
│   │   │   ├── forgot_password_screen.dart
│   │   │   └── reset_password_screen.dart
│   │   │
│   │   ├── dashboard/
│   │   │   ├── student_dashboard_screen.dart
│   │   │   ├── company_dashboard_screen.dart
│   │   │   ├── admin_dashboard_screen.dart
│   │   │   └── dashboard_layout.dart
│   │   │
│   │   ├── profile/
│   │   │   ├── student_profile_screen.dart
│   │   │   ├── company_profile_screen.dart
│   │   │   ├── profile_edit_screen.dart
│   │   │   ├── education_edit_screen.dart
│   │   │   ├── experience_edit_screen.dart
│   │   │   ├── skills_edit_screen.dart
│   │   │   ├── resume_upload_screen.dart
│   │   │   └── onboarding_screen.dart
│   │   │
│   │   ├── jobs/
│   │   │   ├── all_jobs_screen.dart
│   │   │   ├── job_details_screen.dart
│   │   │   ├── applied_jobs_screen.dart
│   │   │   ├── job_application_screen.dart
│   │   │   ├── active_jobs_screen.dart
│   │   │   ├── applicants_screen.dart
│   │   │   ├── pipeline_board_screen.dart
│   │   │   └── job_tracking_screen.dart
│   │   │
│   │   ├── ai/
│   │   │   ├── interview_screen.dart
│   │   │   ├── interview_result_screen.dart
│   │   │   ├── resume_builder_screen.dart
│   │   │   ├── ai_chat_screen.dart
│   │   │   └── pre_interview_onboarding_screen.dart
│   │   │
│   │   ├── assessment/
│   │   │   ├── psychometric_screen.dart
│   │   │   ├── psychometric_result_screen.dart
│   │   │   ├── quiz_screen.dart
│   │   │   ├── quiz_result_screen.dart
│   │   │   ├── intelligence_test_screen.dart
│   │   │   ├── intelligence_dashboard_screen.dart
│   │   │   └── assessment_history_screen.dart
│   │   │
│   │   ├── gamification/
│   │   │   ├── xp_wallet_screen.dart
│   │   │   ├── xp_store_screen.dart
│   │   │   ├── leaderboard_screen.dart
│   │   │   ├── referral_screen.dart
│   │   │   └── community_screen.dart
│   │   │
│   │   ├── settings/
│   │   │   ├── settings_screen.dart
│   │   │   ├── accessibility_settings_screen.dart
│   │   │   ├── language_settings_screen.dart
│   │   │   └── notification_settings_screen.dart
│   │   │
│   │   └── shared/
│   │       ├── splash_screen.dart
│   │       ├── home_screen.dart
│   │       └── navigation_layout.dart
│   │
│   ├── widgets/
│   │   ├── job_card.dart
│   │   ├── candidate_card.dart
│   │   ├── application_status_widget.dart
│   │   ├── xp_widget.dart
│   │   ├── score_display.dart
│   │   ├── form_fields/
│   │   │   ├── custom_text_field.dart
│   │   │   ├── custom_password_field.dart
│   │   │   ├── custom_dropdown.dart
│   │   │   ├── custom_date_picker.dart
│   │   │   └── file_picker_widget.dart
│   │   │
│   │   └── dialogs/
│   │       ├── confirm_dialog.dart
│   │       ├── success_dialog.dart
│   │       ├── error_dialog.dart
│   │       └── loading_dialog.dart
│   │
│   ├── main.dart
│   └── app.dart
│
├── pubspec.yaml
├── pubspec.lock
├── analysis_options.yaml
└── README.md
```

---

## 2. Technology Stack

### Core Framework
```yaml
flutter: 3.24.0+
dart: 3.5.0+
```

### State Management
```yaml
provider: ^6.4.0              # MVVM pattern
riverpod: ^2.4.0              # Alternative - reactive
change_notifier: (built-in)   # Provider uses this
```

### API & Networking
```yaml
dio: ^5.4.0                   # HTTP client with interceptors
retrofit: ^4.1.0              # Code generation for APIs
json_serializable: ^6.7.0     # JSON serialization
```

### Security & Storage
```yaml
flutter_secure_storage: ^9.0.0  # Encrypted token storage
flutter_keychain: ^2.4.1        # Keychain for iOS
shared_preferences: ^2.2.2      # Local preferences
```

### UI & Styling
```yaml
google_fonts: ^6.1.0           # Google Fonts support
flutter_svg: ^2.0.7            # SVG support
cached_network_image: ^3.3.0   # Image caching
video_player: ^2.7.2           # Video playback
image_picker: ^1.0.4           # Media selection
permission_handler: ^11.4.4    # Permissions
```

### Form & Validation
```yaml
formz: ^0.6.1                 # Form validation
validators: ^3.0.0            # Validation utilities
```

### AI & Real-time
```yaml
google_generative_ai: ^0.3.0  # Gemini API (if available)
web_socket_channel: ^2.4.0    # WebSocket support
speech_to_text: ^6.1.1        # Speech recognition
flutter_tts: ^8.1.0           # Text-to-speech
```

### Payment & Monetization
```yaml
razorpay_flutter: ^1.3.7      # Razorpay payment
in_app_purchase: ^0.9.0       # App store payments
```

### Analytics & Logging
```yaml
firebase_core: ^2.24.2        # Firebase setup
firebase_analytics: ^10.6.4   # Analytics
firebase_crashlytics: ^3.4.8  # Crash reporting
flutter_logger: ^0.1.0        # Logging
```

### Localization
```yaml
intl: ^0.19.0                 # Internationalization
flutter_localizations: (built-in)
```

### Date & Time
```yaml
intl: ^0.19.0                 # Date formatting
timezone: ^0.9.2              # Timezone handling
```

### Accessibility
```yaml
accessibility: ^0.1.0         # A11y utilities
screen_reader: ^2.0.0         # Screen reader support
```

---

## 3. MVVM Architecture

### ViewState Pattern

```dart
abstract class ViewState<T> {
  const ViewState();
}

class InitialState<T> extends ViewState<T> {
  const InitialState();
}

class LoadingState<T> extends ViewState<T> {
  const LoadingState();
}

class SuccessState<T> extends ViewState<T> {
  final T data;
  const SuccessState(this.data);
}

class ErrorState<T> extends ViewState<T> {
  final String message;
  final Exception? exception;
  const ErrorState(this.message, {this.exception});
}
```

### ViewModel Base Class

```dart
class BaseViewModel extends ChangeNotifier {
  ViewState _viewState = const InitialState();
  
  ViewState get viewState => _viewState;
  
  void setLoading() {
    _viewState = const LoadingState();
    notifyListeners();
  }
  
  void setSuccess<T>(T data) {
    _viewState = SuccessState(data);
    notifyListeners();
  }
  
  void setError(String message, {Exception? exception}) {
    _viewState = ErrorState(message, exception: exception);
    notifyListeners();
  }
}
```

### Example: LoginViewModel

```dart
class LoginViewModel extends BaseViewModel {
  final AuthRepository _authRepository;
  
  LoginViewModel(this._authRepository);
  
  Future<void> login(String email, String password) async {
    try {
      setLoading();
      final response = await _authRepository.login(email, password);
      setSuccess(response);
    } catch (e) {
      setError('Login failed', exception: e as Exception);
    }
  }
}
```

---

## 4. API Integration Layer

### API Constants

```dart
class ApiConstants {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.vega.com/api',
  );
  
  // Auth Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String registerEndpoint = '/auth/register';
  static const String verifyOtpEndpoint = '/auth/verify-otp';
  static const String forgotPasswordEndpoint = '/auth/forgot-password';
  static const String resetPasswordEndpoint = '/auth/reset-password';
  static const String refreshTokenEndpoint = '/auth/refresh-token';
  
  // Student Endpoints
  static const String studentProfileEndpoint = '/students/profile';
  static const String updateProfileEndpoint = '/students/profile/{userId}/section/{section}';
  static const String uploadResumeEndpoint = '/students/upload-resume/{userId}';
  
  // Job Endpoints
  static const String jobsEndpoint = '/jobs';
  static const String jobDetailsEndpoint = '/jobs/{jobId}';
  static const String applyJobEndpoint = '/jobs/apply';
  
  // AI Endpoints
  static const String interviewKeyEndpoint = '/ai/live-key';
  static const String interviewEvaluationEndpoint = '/ai/queue-interview-evaluation';
  
  // XP Endpoints
  static const String xpBalanceEndpoint = '/xp/balance';
  static const String xpTransactionsEndpoint = '/xp/transactions';
}
```

### HTTP Interceptor with JWT

```dart
class AuthInterceptor extends QueuedInterceptorsManager {
  final SecureStorageService _storage;
  
  AuthInterceptor(this._storage);
  
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.getToken();
    
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    
    handler.next(options);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Attempt token refresh
      final refreshed = await _refreshToken();
      
      if (refreshed) {
        // Retry original request
        handler.resolve(await _retry(err.requestOptions));
      } else {
        // Redirect to login
        handler.next(err);
      }
    } else {
      handler.next(err);
    }
  }
  
  Future<bool> _refreshToken() async {
    // Implementation
    return false;
  }
  
  Future<Response> _retry(RequestOptions requestOptions) async {
    // Implementation
    throw Exception('Not implemented');
  }
}
```

### API Client

```dart
@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class ApiClient {
  factory ApiClient(Dio dio) = _ApiClient;
  
  // Auth
  @POST('/auth/login')
  Future<AuthResponse> login(@Body() LoginRequest request);
  
  @POST('/auth/register')
  Future<ApiResponse> register(@Body() RegisterRequest request);
  
  @POST('/auth/verify-otp')
  Future<ApiResponse> verifyOtp(@Body() VerifyOtpRequest request);
  
  // Jobs
  @GET('/jobs')
  Future<List<JobModel>> getJobs({
    @Query('page') int? page,
    @Query('limit') int? limit,
  });
  
  @GET('/jobs/{jobId}')
  Future<JobModel> getJobDetails(@Path('jobId') int jobId);
  
  @POST('/jobs/apply')
  Future<ApiResponse> applyJob(@Body() ApplyJobRequest request);
  
  // Student Profile
  @GET('/students/profile/{userId}')
  Future<StudentProfileModel> getStudentProfile(@Path('userId') int userId);
  
  @PUT('/students/profile/{userId}/section/{section}')
  Future<ApiResponse> updateProfileSection(
    @Path('userId') int userId,
    @Path('section') String section,
    @Body() Map<String, dynamic> data,
  );
}
```

---

## 5. Repository Pattern

### AuthRepository

```dart
class AuthRepository {
  final ApiClient _apiClient;
  final SecureStorageService _storage;
  
  AuthRepository(this._apiClient, this._storage);
  
  Future<AuthResponse> login(String email, String password) async {
    try {
      final request = LoginRequest(email: email, password: password);
      final response = await _apiClient.login(request);
      
      // Store tokens
      await _storage.saveToken(response.token);
      await _storage.saveRefreshToken(response.refreshToken);
      await _storage.saveUser(response.user);
      
      return response;
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<void> logout() async {
    try {
      await _apiClient.logout();
      await _storage.clearAll();
    } catch (e) {
      // Clear locally even if API fails
      await _storage.clearAll();
      throw _handleError(e);
    }
  }
  
  Future<UserModel?> getStoredUser() async {
    return await _storage.getUser();
  }
  
  Exception _handleError(dynamic e) {
    if (e is DioException) {
      return NetworkException(e.message ?? 'Network error');
    }
    return Exception('Unknown error');
  }
}
```

---

## 6. Secure Storage

### SecureStorageService

```dart
class SecureStorageService {
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userKey = 'user_data';
  
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      keyCipherAlgorithm: KeyCipherAlgorithm.RSA_ECB_OAEPwithSHA_256andMGF1Padding,
      storageCipherAlgorithm: StorageCipherAlgorithm.AES_GCM_NoPadding,
    ),
  );
  
  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }
  
  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }
  
  Future<void> deleteToken() async {
    await _storage.delete(key: _tokenKey);
  }
  
  Future<void> saveRefreshToken(String refreshToken) async {
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }
  
  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }
  
  Future<void> saveUser(UserModel user) async {
    final json = jsonEncode(user.toJson());
    await _storage.write(key: _userKey, value: json);
  }
  
  Future<UserModel?> getUser() async {
    final json = await _storage.read(key: _userKey);
    if (json == null) return null;
    return UserModel.fromJson(jsonDecode(json));
  }
  
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
```

---

## 7. Navigation & Routing

### Route Names

```dart
class RouteNames {
  // Auth Routes
  static const String splash = '/splash';
  static const String login = '/login';
  static const String register = '/register';
  static const String verifyEmail = '/verify-email';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';
  
  // Student Routes
  static const String studentDashboard = '/student/dashboard';
  static const String allJobs = '/student/jobs';
  static const String jobDetails = '/student/jobs/:jobId';
  static const String applyJob = '/student/apply-job/:jobId';
  static const String appliedJobs = '/student/applied-jobs';
  static const String studentProfile = '/student/profile';
  static const String editProfile = '/student/profile/edit';
  
  // Company Routes
  static const String companyDashboard = '/company/dashboard';
  static const String postJob = '/company/post-job';
  static const String activeJobs = '/company/jobs';
  static const String applicants = '/company/applicants';
  static const String pipelineBoard = '/company/pipeline';
  
  // Common Routes
  static const String settings = '/settings';
  static const String accessibility = '/accessibility';
}
```

### GoRouter Configuration

```dart
class AppRoutes {
  static GoRouter router(BuildContext context) {
    return GoRouter(
      redirect: (context, state) {
        // Check authentication
        final authProvider = context.read<AuthViewModel>();
        final isAuthenticated = authProvider.isAuthenticated;
        final isSplash = state.location == RouteNames.splash;
        
        if (!isAuthenticated && !isSplash) {
          return RouteNames.login;
        }
        
        if (isAuthenticated && state.location == RouteNames.login) {
          return RouteNames.studentDashboard;
        }
        
        return null;
      },
      routes: [
        // Auth Routes
        GoRoute(
          path: RouteNames.splash,
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: RouteNames.login,
          builder: (context, state) => const LoginScreen(),
        ),
        // ... more routes
      ],
    );
  }
}
```

---

## 8. Data Models

### Auth Models

```dart
class UserModel {
  final int id;
  final String email;
  final String role;
  final bool isVerified;
  
  UserModel({
    required this.id,
    required this.email,
    required this.role,
    required this.isVerified,
  });
  
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      role: json['role'],
      isVerified: json['is_verified'] ?? false,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'role': role,
      'is_verified': isVerified,
    };
  }
}

class AuthResponse {
  final UserModel user;
  final String token;
  final String refreshToken;
  final Map<String, dynamic> profile;
  
  AuthResponse({
    required this.user,
    required this.token,
    required this.refreshToken,
    required this.profile,
  });
  
  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      user: UserModel.fromJson(json['user']),
      token: json['token'],
      refreshToken: json['refreshToken'],
      profile: json['profile'] ?? {},
    );
  }
}
```

---

## 9. Validation & Form Handling

### Validators

```dart
class AppValidators {
  static String? validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+');
    if (!emailRegex.hasMatch(value)) {
      return 'Enter a valid email';
    }
    return null;
  }
  
  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!RegExp(r'[A-Z]').hasMatch(value)) {
      return 'Password must contain uppercase letter';
    }
    if (!RegExp(r'[a-z]').hasMatch(value)) {
      return 'Password must contain lowercase letter';
    }
    if (!RegExp(r'[0-9]').hasMatch(value)) {
      return 'Password must contain digit';
    }
    if (!RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(value)) {
      return 'Password must contain special character';
    }
    return null;
  }
}
```

---

## 10. Service Layer

### LocalStorageService

```dart
class LocalStorageService {
  static const String _selectedLanguageKey = 'selected_language';
  static const String _darkModeKey = 'dark_mode';
  
  final SharedPreferences _prefs;
  
  LocalStorageService(this._prefs);
  
  Future<void> setSelectedLanguage(String language) async {
    await _prefs.setString(_selectedLanguageKey, language);
  }
  
  String getSelectedLanguage() {
    return _prefs.getString(_selectedLanguageKey) ?? 'en';
  }
  
  Future<void> setDarkMode(bool isDark) async {
    await _prefs.setBool(_darkModeKey, isDark);
  }
  
  bool isDarkMode() {
    return _prefs.getBool(_darkModeKey) ?? false;
  }
}
```

---

## 11. Internationalization

### Localization Setup

```dart
class AppLocalizations {
  static Map<String, Map<String, String>> translations = {
    'en': {
      'login': 'Login',
      'password': 'Password',
      'email': 'Email',
      'register': 'Register',
      'logout': 'Logout',
      // ... more translations
    },
    'mr': {
      'login': 'लॉगिन',
      'password': 'पासवर्ड',
      'email': 'ईमेल',
      'register': 'नोंदणी करा',
      'logout': 'लॉगआउट',
      // ... more translations
    },
  };
  
  static String get(String key, String language) {
    return translations[language]?[key] ?? key;
  }
}
```

---

## 12. Accessibility

### Screen Reader Support

```dart
class AccessibilityUtils {
  static void announceMessage(
    BuildContext context,
    String message, {
    TextDirection textDirection = TextDirection.ltr,
  }) {
    SemanticsService.announce(
      message,
      textDirection: textDirection,
    );
  }
  
  static Semantics createSemanticButton(
    VoidCallback onTap,
    String label,
    Widget child,
  ) {
    return Semantics(
      enabled: true,
      onTap: onTap,
      label: label,
      child: child,
    );
  }
}
```

---

## 13. Error Handling

### NetworkException

```dart
class NetworkException implements Exception {
  final String message;
  
  NetworkException(this.message);
  
  @override
  String toString() => 'NetworkException: $message';
}

class AppException implements Exception {
  final String message;
  final int? statusCode;
  
  AppException(this.message, {this.statusCode});
  
  @override
  String toString() => 'AppException: $message';
}
```

---

## 14. Dependency Injection

### ServiceLocator Setup

```dart
void setupServiceLocator() {
  // Storage
  getIt.registerSingleton<SecureStorageService>(
    SecureStorageService(),
  );
  
  getIt.registerSingleton<LocalStorageService>(
    LocalStorageService(getIt()),
  );
  
  // Network
  final dio = Dio();
  dio.interceptors.add(
    AuthInterceptor(getIt<SecureStorageService>()),
  );
  
  getIt.registerSingleton<ApiClient>(
    ApiClient(dio),
  );
  
  // Repositories
  getIt.registerSingleton<AuthRepository>(
    AuthRepository(getIt<ApiClient>(), getIt<SecureStorageService>()),
  );
  
  // ViewModels
  getIt.registerSingleton<AuthViewModel>(
    AuthViewModel(getIt<AuthRepository>()),
  );
}
```

---

## 15. Provider Setup

### AppWidget

```dart
class AppWidget extends StatelessWidget {
  const AppWidget({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => getIt<AuthViewModel>(),
        ),
        ChangeNotifierProvider(
          create: (_) => getIt<StudentProfileViewModel>(),
        ),
        // ... more providers
      ],
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        routerConfig: AppRoutes.router(context),
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('en'),
          Locale('mr'),
        ],
      ),
    );
  }
}
```

---

## 16. Development Workflow

### Phase-wise Implementation Order

1. **Phase 1**: Core setup (DI, routing, themes)
2. **Phase 2**: Auth module (login, register, token management)
3. **Phase 3**: Profile management (view, edit)
4. **Phase 4**: Job listing and details
5. **Phase 5**: Job application flow
6. **Phase 6**: AI features (interview, resume builder)
7. **Phase 7**: Assessments (psychometric, quizzes)
8. **Phase 8**: Gamification (XP, leaderboard)
9. **Phase 9**: Settings and accessibility
10. **Phase 10**: Testing and optimization

---

## 17. Build & Deployment Configuration

### pubspec.yaml Structure

```yaml
name: vega
description: VEGA - Talent Acquisition Mobile App
version: 1.0.0+1

environment:
  sdk: ">=3.5.0 <4.0.0"
  flutter: ">=3.24.0"

dependencies:
  flutter:
    sdk: flutter
  provider: ^6.4.0
  dio: ^5.4.0
  retrofit: ^4.1.0
  json_serializable: ^6.7.0
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2
  google_fonts: ^6.1.0
  flutter_svg: ^2.0.7
  cached_network_image: ^3.3.0
  formz: ^0.6.1
  razorpay_flutter: ^1.3.7
  intl: ^0.19.0
  get_it: ^7.6.0
  go_router: ^13.0.0
  connectivity_plus: ^5.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.6
  retrofit_generator: ^8.1.0
  json_serializable: ^6.7.0
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
    - assets/icons/
    - assets/fonts/
  fonts:
    - family: GoogleSans
      fonts:
        - asset: assets/fonts/GoogleSans-Regular.ttf
        - asset: assets/fonts/GoogleSans-Bold.ttf
          weight: 700
```

---

## 18. Ready for Implementation

- [x] Complete project structure designed
- [x] MVVM architecture documented
- [x] State management pattern defined
- [x] API integration layer planned
- [x] Repository pattern established
- [x] Secure storage configured
- [x] Navigation routing defined
- [x] Data models structure planned
- [x] Service layer organized
- [x] Dependency injection setup

**Architecture Review Status: APPROVED ✅**

**Next Step: Begin Phase 3 - Implement API Layer**
