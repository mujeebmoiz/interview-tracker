from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class JobApplication(models.Model):

    class StatusChoices(models.TextChoices):
        APPLIED = "APPLIED", "Applied"
        OA = "OA", "Online Assessment"
        INTERVIEW = "INTERVIEW", "Interview"
        OFFER = "OFFER", "Offer"
        REJECTED = "REJECTED", "Rejected"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="applications"
    )

    company_name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)
    application_date = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.APPLIED
    )
    location = models.CharField(max_length=255, blank=True, null=True)
    salary_range = models.CharField(max_length=100, blank=True, null=True)

    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    url = models.URLField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("user", "company_name", "job_title")

    def __str__(self):
        return f"{self.job_title} at {self.company_name}"