from django.urls import path
from .views import RegisterView
from .views import JobApplicationListCreateView,JobApplicationDetailView, ApplicationStatsView

urlpatterns = [
    path('applications/', JobApplicationListCreateView.as_view()),
    path('applications/<int:pk>/', JobApplicationDetailView.as_view()),
    path('applications/stats/', ApplicationStatsView.as_view()),
    path("register/", RegisterView.as_view(), name="register"),
]