import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBuyerStore } from '../stores/buyerStore';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Lock,
  Star,
  ShoppingBag,
  Gift,
  Heart,
  Edit3,
  Camera
} from 'lucide-react';

export default function BuyerProfilePage() {
  const { profile, updateProfile, addresses, followedShops } = useBuyerStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(profile || {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const handleSave = () => {
    updateProfile(editData);
    setIsEditing(false);
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-8 mb-8"
        >
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={profile.avatar}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-orange-100"
              />
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-orange-500 hover:bg-orange-600"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
              <p className="text-gray-600 mb-4">{profile.email}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{profile.totalOrders}</div>
                  <div className="text-sm text-gray-500">Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">₱{profile.totalSpent.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Total Spent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{profile.loyaltyPoints}</div>
                  <div className="text-sm text-gray-500">Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{followedShops.length}</div>
                  <div className="text-sm text-gray-500">Following</div>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </motion.div>

        {/* Profile Content */}
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Personal Information */}
          <TabsContent value="personal">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-orange-600" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>First Name</Label>
                          <Input
                            value={editData.firstName || ''}
                            onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Last Name</Label>
                          <Input
                            value={editData.lastName || ''}
                            onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={editData.email || ''}
                          onChange={(e) => setEditData({...editData, email: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({...editData, phone: e.target.value})}
                        />
                      </div>
                      <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{profile.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{profile.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>Member since {profile.memberSince.toLocaleDateString()}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-orange-600" />
                    Shopping Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Orders</span>
                      <span className="font-semibold">{profile.totalOrders}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Spent</span>
                      <span className="font-semibold text-orange-600">₱{profile.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Loyalty Points</span>
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold">{profile.loyaltyPoints}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Average Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-current text-yellow-400" />
                        <span className="font-semibold">4.8</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Addresses */}
          <TabsContent value="addresses">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {addresses.map((address) => (
                <Card key={address.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{address.label}</h3>
                          {address.isDefault && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-gray-600">
                          <p>{address.fullName}</p>
                          <p>{address.phone}</p>
                          <p>{address.street}, {address.barangay}</p>
                          <p>{address.city}, {address.province} {address.postalCode}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button className="bg-orange-500 hover:bg-orange-600">
                <MapPin className="h-4 w-4 mr-2" />
                Add New Address
              </Button>
            </motion.div>
          </TabsContent>

          {/* Following */}
          <TabsContent value="following">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {[1,2,3].map((shop) => (
                <Card key={shop}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={`https://images.unsplash.com/photo-156047235412${shop}?w=60&h=60&fit=crop`}
                        alt="Shop"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">TechHub Philippines</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Star className="h-3 w-3 fill-current text-yellow-400" />
                          <span>4.8</span>
                          <span>•</span>
                          <span>2.5k followers</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                        <Heart className="h-4 w-4 mr-1 fill-current" />
                        Unfollow
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-600" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-gray-500">Receive order updates via email</div>
                    </div>
                    <Switch checked={profile.preferences.notifications.email} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">SMS Notifications</div>
                      <div className="text-sm text-gray-500">Receive delivery updates via SMS</div>
                    </div>
                    <Switch checked={profile.preferences.notifications.sms} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Push Notifications</div>
                      <div className="text-sm text-gray-500">Receive app notifications</div>
                    </div>
                    <Switch checked={profile.preferences.notifications.push} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-orange-600" />
                    Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Show Profile</div>
                      <div className="text-sm text-gray-500">Make your profile visible to others</div>
                    </div>
                    <Switch checked={profile.preferences.privacy.showProfile} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Show Purchase History</div>
                      <div className="text-sm text-gray-500">Display your purchase activity</div>
                    </div>
                    <Switch checked={profile.preferences.privacy.showPurchases} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Show Following List</div>
                      <div className="text-sm text-gray-500">Display shops you follow</div>
                    </div>
                    <Switch checked={profile.preferences.privacy.showFollowing} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}