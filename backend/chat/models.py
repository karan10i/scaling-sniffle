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

class FriendRequest(models.Model):
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_requests')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_requests')
    status = models.CharField(max_length=10, choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f"{self.from_user.username} -> {self.to_user.username} ({self.status})"
    
class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    seen = models.BooleanField(default=False)  # True when receiver views the message
    is_saved = models.BooleanField(default=False)  # True if receiver saves to vault
    saved_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_messages', null=True, blank=True)  # Who saved it

    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username} at {self.timestamp}"