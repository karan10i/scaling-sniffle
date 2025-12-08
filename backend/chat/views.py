from django.shortcuts import render

from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Profile, Message
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Q

class SignupView(generics.GenericAPIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user_name = request.data.get('user_name')

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        if Profile.objects.filter(user_name=user_name).exists():
            return Response({'error': 'Profile name already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        Profile.objects.create(user=user, user_name=user_name)
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

class LoginView(TokenObtainPairView):
    pass

# Search for users by username or profile name
class SearchUsersView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('q', '')
        
        if not query or len(query) < 2:
            return Response({'error': 'Query must be at least 2 characters'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Search by username or profile name
        users = Profile.objects.filter(
            Q(user_name__icontains=query) | Q(user__username__icontains=query)
        ).exclude(user=request.user)  # Exclude current user
        
        results = []
        for profile in users:
            results.append({
                'id': profile.user.id,
                'username': profile.user.username,
                'user_name': profile.user_name,
            })
        
        return Response({'results': results})

# Add a friend
class AddFriendView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        friend_id = request.data.get('friend_id')
        
        if not friend_id:
            return Response({'error': 'friend_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            friend_user = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if already friends
        from .models import Friend
        if Friend.objects.filter(user=request.user, friend=friend_user).exists():
            return Response({'error': 'Already friends'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create friendship
        Friend.objects.create(user=request.user, friend=friend_user)
        
        return Response({'message': f'Added {friend_user.username} as friend!'}, status=status.HTTP_201_CREATED)

# List current user's friends
class ListFriendsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import Friend
        friends = Friend.objects.filter(user=request.user)
        
        results = []
        for friendship in friends:
            friend_profile = Profile.objects.get(user=friendship.friend)
            results.append({
                'id': friendship.friend.id,
                'username': friendship.friend.username,
                'user_name': friend_profile.user_name,
            })
        
        return Response({
            'friends': results,
            'count': len(results)
        })

# Get user profile
class UserProfileView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        profile = Profile.objects.get(user=request.user)
        from .models import Friend
        friend_count = Friend.objects.filter(user=request.user).count()
        
        return Response({
            'username': request.user.username,
            'user_name': profile.user_name,
            'friend_count': friend_count,
        })

# Send friend request
class SendFriendRequestView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        to_user_id = request.data.get('to_user_id')
        
        if not to_user_id:
            return Response({'error': 'to_user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            to_user = User.objects.get(id=to_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.user == to_user:
            return Response({'error': 'Cannot send request to yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import FriendRequest, Friend
        
        # Check if already friends
        if Friend.objects.filter(user=request.user, friend=to_user).exists():
            return Response({'error': 'Already friends'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if request already exists
        existing = FriendRequest.objects.filter(from_user=request.user, to_user=to_user).first()
        if existing:
            return Response({'error': f'Request already {existing.status}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create request
        FriendRequest.objects.create(from_user=request.user, to_user=to_user)
        
        return Response({'message': 'Friend request sent!'}, status=status.HTTP_201_CREATED)

# Get pending friend requests
class ListPendingRequestsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import FriendRequest
        pending = FriendRequest.objects.filter(to_user=request.user, status='pending')
        
        results = []
        for req in pending:
            from_profile = Profile.objects.get(user=req.from_user)
            results.append({
                'request_id': req.id,
                'from_user_id': req.from_user.id,
                'username': req.from_user.username,
                'user_name': from_profile.user_name,
            })
        
        return Response({'requests': results, 'count': len(results)})

# Accept friend request
class AcceptFriendRequestView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        request_id = request.data.get('request_id')
        
        if not request_id:
            return Response({'error': 'request_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from .models import FriendRequest, Friend
            friend_req = FriendRequest.objects.get(id=request_id, to_user=request.user)
        except:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if friend_req.status != 'pending':
            return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update request status
        friend_req.status = 'accepted'
        friend_req.save()
        
        # Create friendship (both ways for mutual friendship)
        Friend.objects.get_or_create(user=friend_req.from_user, friend=friend_req.to_user)
        Friend.objects.get_or_create(user=friend_req.to_user, friend=friend_req.from_user)
        
        return Response({'message': 'Friend request accepted!'}, status=status.HTTP_200_OK)

# Reject friend request
class RejectFriendRequestView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        request_id = request.data.get('request_id')
        
        if not request_id:
            return Response({'error': 'request_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from .models import FriendRequest
            friend_req = FriendRequest.objects.get(id=request_id, to_user=request.user)
        except:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if friend_req.status != 'pending':
            return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update request status
        friend_req.status = 'rejected'
        friend_req.save()
        
        return Response({'message': 'Friend request rejected!'}, status=status.HTTP_200_OK)

# ============ MESSAGING ENDPOINTS ============

# Send a message to a friend
class SendMessageView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        content = request.data.get('content')
        
        if not receiver_id or not content:
            return Response({'error': 'receiver_id and content are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist:
            return Response({'error': 'Receiver not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if they are friends
        from .models import Friend
        if not Friend.objects.filter(user=request.user, friend=receiver).exists():
            return Response({'error': 'You can only message friends'}, status=status.HTTP_403_FORBIDDEN)
        
        # Create message
        message = Message.objects.create(
            sender=request.user,
            receiver=receiver,
            content=content
        )
        
        return Response({
            'message': 'Message sent!',
            'message_id': message.id,
            'timestamp': message.timestamp
        }, status=status.HTTP_201_CREATED)

# Get messages between current user and another user
class GetMessagesView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        other_user_id = request.query_params.get('user_id')
        
        if not other_user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get all unsaved messages between these two users
        # Ephemeral logic: only show messages that haven't been saved (or are saved by the current user)
        messages = Message.objects.filter(
            Q(sender=request.user, receiver=other_user) | Q(sender=other_user, receiver=request.user)
        ).filter(
            Q(is_saved=False) | Q(saved_by=request.user)
        ).order_by('timestamp')
        
        results = []
        for msg in messages:
            results.append({
                'id': msg.id,
                'sender_id': msg.sender.id,
                'sender_username': msg.sender.username,
                'receiver_id': msg.receiver.id,
                'content': msg.content,
                'timestamp': msg.timestamp,
                'seen': msg.seen,
                'is_saved': msg.is_saved and msg.saved_by == request.user,  # Only show save status if current user saved it
            })
        
        return Response({'messages': results, 'count': len(results)})

# Mark messages as seen
class MarkMessagesSeenView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        sender_id = request.data.get('sender_id')
        
        if not sender_id:
            return Response({'error': 'sender_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark all unseen messages from sender to current user as seen
        Message.objects.filter(
            sender_id=sender_id,
            receiver=request.user,
            seen=False
        ).update(seen=True)
        
        return Response({'message': 'Messages marked as seen'}, status=status.HTTP_200_OK)

# Delete a message (only receiver can delete)
class DeleteMessageView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'error': 'message_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Only receiver can delete (unless it's saved, then only the saver can delete)
        if message.is_saved:
            if message.saved_by != request.user:
                return Response({'error': 'You cannot delete this message'}, status=status.HTTP_403_FORBIDDEN)
        else:
            if message.receiver != request.user:
                return Response({'error': 'Only the receiver can delete messages'}, status=status.HTTP_403_FORBIDDEN)
        
        message.delete()
        return Response({'message': 'Message deleted'}, status=status.HTTP_200_OK)

# ============ VAULT ENDPOINTS ============

# Save a message to vault (Silent Save)
class SaveMessageToVaultView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'error': 'message_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Only receiver can save
        if message.receiver != request.user:
            return Response({'error': 'You can only save messages sent to you'}, status=status.HTTP_403_FORBIDDEN)
        
        # Save the message
        message.is_saved = True
        message.saved_by = request.user
        message.save()
        
        return Response({'message': 'Message saved to vault'}, status=status.HTTP_200_OK)

# List all saved messages (Vault)
class ListVaultMessagesView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get all messages saved by current user
        messages = Message.objects.filter(saved_by=request.user, is_saved=True).order_by('-timestamp')
        
        results = []
        for msg in messages:
            results.append({
                'id': msg.id,
                'sender_id': msg.sender.id,
                'sender_username': msg.sender.username,
                'content': msg.content,
                'timestamp': msg.timestamp,
            })
        
        return Response({'messages': results, 'count': len(results)})

# Delete message from vault
class DeleteFromVaultView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'error': 'message_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            message = Message.objects.get(id=message_id, saved_by=request.user, is_saved=True)
        except Message.DoesNotExist:
            return Response({'error': 'Message not found in vault'}, status=status.HTTP_404_NOT_FOUND)
        
        # Delete the message
        message.delete()
        return Response({'message': 'Message removed from vault'}, status=status.HTTP_200_OK)

# Clean up ephemeral messages (delete all unsaved messages for current user)
class CleanupEphemeralMessagesView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Delete all unsaved messages where current user is sender or receiver
        deleted_count = Message.objects.filter(
            Q(sender=request.user) | Q(receiver=request.user),
            is_saved=False
        ).delete()[0]
        
        return Response({
            'message': 'Ephemeral messages cleaned up',
            'deleted_count': deleted_count
        }, status=status.HTTP_200_OK)
