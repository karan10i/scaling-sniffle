from django.urls import path
from .views import SignupView, LoginView, SearchUsersView, AddFriendView, ListFriendsView, UserProfileView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('search-users/', SearchUsersView.as_view(), name='search-users'),
    path('add-friend/', AddFriendView.as_view(), name='add-friend'),
    path('list-friends/', ListFriendsView.as_view(), name='list-friends'),
    path('profile/', UserProfileView.as_view(), name='profile'),
]