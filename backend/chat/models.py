from django.contrib.auth.models import User
from django.db import models

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    user_name = models.CharField(max_length=150, unique=True)

    def __str__(self):
        return self.user_name

class Friend(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friends_added')
    friend = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friend_of')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'friend')

    def __str__(self):
        return f"{self.user.username} - {self.friend.username}"