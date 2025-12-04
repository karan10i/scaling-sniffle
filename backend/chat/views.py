from django.shortcuts import render

from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Profile
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
