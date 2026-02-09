import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import {
  User,
  Mail,
  Shield,
  Clock,
  Key,
  LogOut
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const AdminProfile: React.FC = () => {
  const { user, isAuthenticated, logout } = useAdminAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500 mt-1">Manage your account settings and view permissions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="md:col-span-1">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500 mb-4">{user.email}</p>
                <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'} className="mb-6">
                  {user.role.replace('_', ' ').toUpperCase()}
                </Badge>

                <Button variant="destructive" className="w-full" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Details & Permissions */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your personal details and login activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium text-gray-900">{user.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Email Address</p>
                      <p className="font-medium text-gray-900">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Last Login</p>
                      <p className="font-medium text-gray-900">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Permissions & Access</CardTitle>
                  <CardDescription>Resources you have access to manage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {user.permissions.map((permission) => (
                      <div key={permission.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-lg">
                        <div className="flex items-center">
                          <Shield className="w-5 h-5 text-[var(--brand-primary)] mr-3" />
                          <div>
                            <p className="font-medium text-gray-900 capitalize">{permission.resource}</p>
                            <p className="text-xs text-gray-500">{permission.name}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {permission.actions.map((action) => (
                            <Badge key={action} variant="outline" className="text-xs capitalize">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full justify-start">
                    <Key className="w-4 h-4 mr-2" /> Change Password
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
