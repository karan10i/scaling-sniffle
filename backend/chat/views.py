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
