from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import JobApplication
from .serializers import JobApplicationSerializer, RegisterSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from django.contrib.auth.models import User



class JobApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'company_name']

    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class JobApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user)
    

class ApplicationStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_apps = JobApplication.objects.filter(user=request.user)

        total = user_apps.count()
        offers = user_apps.filter(status="OFFER").count()
        interviews = user_apps.filter(status="INTERVIEW").count()
        rejections = user_apps.filter(status="REJECTED").count()

        conversion_rate = offers / total if total > 0 else 0

        return Response({
            "total": total,
            "offers": offers,
            "interviews": interviews,
            "rejections": rejections,
            "conversion_rate": round(conversion_rate, 2)
        })

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer