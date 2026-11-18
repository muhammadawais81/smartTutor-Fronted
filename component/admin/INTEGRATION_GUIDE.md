/**
 * ADMIN MODULE INTEGRATION GUIDE
 *
 * This guide explains how to integrate the admin module into your React Native app
 * with proper navigation setup and authentication handling.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import admin components
import {
  AdminDashboard,
  ManageTeachersScreen,
  AllTeachersScreen,
  TeacherDetailScreen,
  TeacherApprovalScreen,
} from '../component/admin';

// ============================================================================
// EXAMPLE 1: Admin Stack Navigator Setup
// ============================================================================

const AdminStack = createNativeStackNavigator();

export function AdminStackNavigator() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false, // Components have custom headers
        animationEnabled: true,
        cardStyle: { backgroundColor: '#fff' },
      }}>
      
      {/* Admin Dashboard - Entry Point */}
      <AdminStack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          title: 'Admin Dashboard',
          gestureEnabled: false, // Prevent back gesture on main screen
        }}
      />

      {/* Pending Teachers Management */}
      <AdminStack.Screen
        name="ManageTeachers"
        component={ManageTeachersScreen}
        options={{
          title: 'Manage Teachers',
        }}
      />

      {/* All Teachers with Filtering */}
      <AdminStack.Screen
        name="AllTeachers"
        component={AllTeachersScreen}
        options={{
          title: 'All Teachers',
        }}
      />

      {/* Teacher Detailed View */}
      <AdminStack.Screen
        name="TeacherDetail"
        component={TeacherDetailScreen}
        options={{
          title: 'Teacher Details',
        }}
        listeners={({ navigation }) => ({
          beforeRemove: (e) => {
            // Handle back navigation if needed
          },
        })}
      />

      {/* Teacher Approval Workflow */}
      <AdminStack.Screen
        name="TeacherApproval"
        component={TeacherApprovalScreen}
        options={{
          title: 'Approve/Reject Teacher',
        }}
      />
    </AdminStack.Navigator>
  );
}

// ============================================================================
// EXAMPLE 2: Root Navigation with Admin Check
// ============================================================================

interface RootStackParamList {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Admin: undefined;
  Teachers: undefined;
}

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [initialRoute, setInitialRoute] = React.useState<'Login' | 'Home' | 'Admin'>('Login');

  React.useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userRole = await AsyncStorage.getItem('user_role');

      if (!token) {
        setInitialRoute('Login');
        setIsAdmin(false);
      } else if (userRole?.toLowerCase() === 'admin') {
        setInitialRoute('Admin');
        setIsAdmin(true);
      } else {
        setInitialRoute('Home');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setInitialRoute('Login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Show splash screen here
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={initialRoute}>
        
        {/* Authentication Screens */}
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Register" component={RegisterScreen} />

        {/* Regular User Screens */}
        <RootStack.Screen name="Home" component={HomeScreen} />

        {/* Admin Screens */}
        {isAdmin && (
          <RootStack.Screen
            name="Admin"
            component={AdminStackNavigator}
            options={{
              animationEnabled: false,
            }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

// ============================================================================
// EXAMPLE 3: Handling Admin Dashboard Navigation
// ============================================================================

interface AdminDashboardScreenProps {
  route: any;
  navigation: any;
}

export function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const handleLogout = async () => {
    try {
      // Clear authentication data
      await AsyncStorage.multiRemove([
        'access_token',
        'refresh_token',
        'user_id',
        'user_email',
        'user_role',
      ]);

      // Navigate to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigateToManageTeachers = () => {
    navigation.navigate('ManageTeachers');
  };

  const handleNavigateToAllTeachers = () => {
    navigation.navigate('AllTeachers');
  };

  return (
    <AdminDashboard
      onLogout={handleLogout}
      onNavigateToTeachers={handleNavigateToManageTeachers}
      onNavigateToAllTeachers={handleNavigateToAllTeachers}
    />
  );
}

// ============================================================================
// EXAMPLE 4: Handling Teacher Selection in AllTeachersScreen
// ============================================================================

interface AllTeachersScreenProps {
  navigation: any;
}

export function AllTeachersScreenWrapper({ navigation }: AllTeachersScreenProps) {
  const handleSelectTeacher = (teacherId: number) => {
    // Option 1: Show teacher details
    navigation.navigate('TeacherDetail', {
      teacherId,
    });

    // Option 2: Go directly to approval if needed
    // navigation.navigate('TeacherApproval', {
    //   teacherId,
    // });
  };

  return (
    <AllTeachersScreen
      onBack={() => navigation.goBack()}
      onSelectTeacher={handleSelectTeacher}
    />
  );
}

// ============================================================================
// EXAMPLE 5: Handling Teacher Approval Completion
// ============================================================================

interface TeacherApprovalScreenProps {
  route: any;
  navigation: any;
}

export function TeacherApprovalScreenWrapper({
  route,
  navigation,
}: TeacherApprovalScreenProps) {
  const { teacherId } = route.params;

  const handleApprovalComplete = () => {
    // Trigger refresh in the previous screen
    // You can use Navigation event listeners or context
    navigation.navigate('ManageTeachers', {
      refreshTrigger: Date.now(),
    });
  };

  return (
    <TeacherApprovalScreen
      teacherId={teacherId}
      onBack={() => navigation.goBack()}
      onApprovalComplete={handleApprovalComplete}
    />
  );
}

// ============================================================================
// EXAMPLE 6: Admin Access Guard
// ============================================================================

/**
 * Higher-order component to protect admin screens
 */
export function withAdminCheck<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AdminCheckedComponent(props: P & { navigation: any }) {
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [checking, setChecking] = React.useState(true);

    React.useEffect(() => {
      checkAdmin();
    }, []);

    const checkAdmin = async () => {
      try {
        const userRole = await AsyncStorage.getItem('user_role');
        const isAdminUser = userRole?.toLowerCase() === 'admin';
        setIsAdmin(isAdminUser);

        if (!isAdminUser) {
          // Navigate away if not admin
          props.navigation.replace('Home');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        props.navigation.replace('Home');
      } finally {
        setChecking(false);
      }
    };

    if (checking) {
      return null; // Show loading screen
    }

    if (!isAdmin) {
      return null; // Component not rendered if not admin
    }

    return <WrappedComponent {...(props as P)} />;
  };
}

// Usage:
// export const ProtectedAdminDashboard = withAdminCheck(AdminDashboard);

// ============================================================================
// EXAMPLE 7: Using Admin Hooks in Custom Screens
// ============================================================================

import { useTeacherStats, useTeacherApproval } from '../component/admin';

export function CustomAdminMetricsScreen() {
  const { stats, loading, error, loadStats } = useTeacherStats();
  const { processing, handleApprove, handleReject } = useTeacherApproval();

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return <Text>Loading stats...</Text>;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <View>
      <Text>Approved: {stats?.approved}</Text>
      <Text>Pending: {stats?.pending_approval}</Text>
      <Text>Total: {stats?.total_teachers}</Text>
    </View>
  );
}

// ============================================================================
// EXAMPLE 8: Deep Linking Setup
// ============================================================================

const linking = {
  prefixes: ['smarttutor://', 'https://smarttutor.com'],
  config: {
    screens: {
      Admin: {
        screens: {
          AdminDashboard: 'admin/dashboard',
          ManageTeachers: 'admin/teachers/pending',
          AllTeachers: 'admin/teachers',
          TeacherDetail: 'admin/teachers/:teacherId',
          TeacherApproval: 'admin/teachers/:teacherId/approve',
        },
      },
      Home: 'home',
      Login: 'login',
    },
  },
};

// Usage:
// <NavigationContainer linking={linking}>
//   {/* Navigation content */}
// </NavigationContainer>

// ============================================================================
// EXAMPLE 9: Error Boundary for Admin Screens
// ============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class AdminErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Admin module error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong in the admin module</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Usage:
// <AdminErrorBoundary onError={(err) => console.log(err)}>
//   <AdminStackNavigator />
// </AdminErrorBoundary>

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/**
 * Before going to production:
 *
 * ✓ Import all admin components
 * ✓ Set up admin stack navigator
 * ✓ Implement admin role checking
 * ✓ Configure deep linking for admin routes
 * ✓ Set up error boundaries
 * ✓ Test all admin workflows:
 *   - View pending teachers
 *   - View all teachers with filters
 *   - View teacher details
 *   - Approve teacher
 *   - Reject teacher with reason
 *   - Suspend teacher
 * ✓ Verify statistics loading and display
 * ✓ Test network error handling
 * ✓ Test logout functionality
 * ✓ Verify authentication header is sent
 * ✓ Test with devices on same network
 * ✓ Check styling and layout on different screen sizes
 * ✓ Test pull-to-refresh functionality
 * ✓ Verify real-time data updates
 */

// ============================================================================
// NOTES
// ============================================================================

/**
 * Key Points:
 *
 * 1. All admin screens require valid JWT token and admin role
 * 2. Use headerShown: false to let components manage their own headers
 * 3. Always check user role before showing admin screens
 * 4. Implement proper error handling and user feedback
 * 5. Test with real API server running
 * 6. Use AsyncStorage to persist authentication state
 * 7. Consider implementing deep linking for direct admin access
 * 8. Use error boundaries to catch and report errors gracefully
 * 9. Implement proper logging for debugging
 * 10. Consider offline support if needed
 */
