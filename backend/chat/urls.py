from django.urls import path
from .views import (
    SignupView, LoginView, SearchUsersView, AddFriendView, ListFriendsView, UserProfileView,
    SendFriendRequestView, ListPendingRequestsView, AcceptFriendRequestView, RejectFriendRequestView,
    SendMessageView, GetMessagesView,
    SaveMessageToVaultView, ListVaultMessagesView, DeleteFromVaultView
)

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('search-users/', SearchUsersView.as_view(), name='search-users'),
    path('add-friend/', AddFriendView.as_view(), name='add-friend'),
    path('list-friends/', ListFriendsView.as_view(), name='list-friends'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('send-request/', SendFriendRequestView.as_view(), name='send-request'),
    path('pending-requests/', ListPendingRequestsView.as_view(), name='pending-requests'),
    path('accept-request/', AcceptFriendRequestView.as_view(), name='accept-request'),
    path('reject-request/', RejectFriendRequestView.as_view(), name='reject-request'),
    
    # Messaging endpoints (RAM-only)
    path('send-message/', SendMessageView.as_view(), name='send-message'),
    path('get-messages/', GetMessagesView.as_view(), name='get-messages'),
    
    # Vault endpoints
    path('save-to-vault/', SaveMessageToVaultView.as_view(), name='save-to-vault'),
    path('list-vault/', ListVaultMessagesView.as_view(), name='list-vault'),
    path('delete-from-vault/', DeleteFromVaultView.as_view(), name='delete-from-vault'),
]