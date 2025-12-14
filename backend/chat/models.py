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
    
    # Vault tracking (Silent Save)
    # Each user can independently save a message
    saved_by_sender = models.BooleanField(default=False)  # Sender saved it
    saved_by_receiver = models.BooleanField(default=False)  # Receiver saved it

    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username} at {self.timestamp}"


# ============ ENCRYPTION MODELS (Matrix/Olm E2EE) ============

class UserKeys(models.Model):
    """
    Store public keys for each user.
    Server acts as a key directory - it never sees private keys.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='keys')
    identity_key = models.CharField(max_length=255)      # Curve25519 for encryption
    signing_key = models.CharField(max_length=255)       # Ed25519 for signatures
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Keys for {self.user.username}"


class OneTimeKeys(models.Model):
    """
    Disposable keys for initial key exchange (X3DH handshake).
    Each OTK can only be used once to establish a session.
    """
    user = models.ForeignKey(User, related_name='one_time_keys', on_delete=models.CASCADE)
    key_id = models.CharField(max_length=50)
    key_value = models.CharField(max_length=255)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "One Time Keys"
        unique_together = ('user', 'key_id')

    def __str__(self):
        status = "used" if self.is_used else "available"
        return f"OTK {self.key_id} for {self.user.username} ({status})"