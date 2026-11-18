/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  useColorScheme,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppStatusBar} from './component/common';
// Auth components
import LoginScreen from './component/auth/LoginScreen';
import SignupScreen from './component/auth/SignupScreen';
import ForgotPasswordScreen from './component/auth/ForgotPasswordScreen';
// Teacher components
import TeacherDashboard from './component/teacher/TeacherDashboard';
import TeacherProfileSettings from './component/teacher/TeacherProfileSettings';
import TeacherDetailScreen from './component/teacher/TeacherDetailScreen';
import TeacherMessagesScreen from './component/teacher/TeacherMessagesScreen';
import TeacherProfileWizard from './component/teacher/TeacherProfileWizard';
import TeacherProfileStatusScreen from './component/teacher/TeacherProfileStatusScreen';
import TeacherListScreen from './component/teacher/TeacherListScreen';
import TeacherEnrollmentRequestsScreen from './component/teacher/TeacherEnrollmentRequestsScreen';
import TeacherStudentsScreen from './component/teacher/TeacherStudentsScreen';
import TeacherStudentPortalScreen from './component/teacher/TeacherStudentPortalScreen';
import TeacherStudentsBySubjectScreen from './component/teacher/TeacherStudentsBySubjectScreen';
import TeacherVideoClassScreen from './component/teacher/TeacherVideoClassScreen';
import TeacherVideoCallRoomScreen from './component/teacher/TeacherVideoCallRoomScreen';
import TeacherAddParentScreen from './component/teacher/TeacherAddParentScreen';
import TeacherAssistantScreen from './component/teacher/TeacherAssistantScreen';
// Student components
import StudentDashboard from './component/student/StudentDashboard';
import StudentProfileSettings from './component/student/StudentProfileSettings';
import StudentProfileEdit from './component/student/StudentProfileEdit';
import StudentJoinClassScreen from './component/student/StudentJoinClassScreen';
import StudentVideoCallRoomScreen from './component/student/StudentVideoCallRoomScreen';
import StudentPortalScreen from './component/student/StudentPortalScreen';
import TutorMapScreen from './component/student/TutorMapScreen';
import WhiteboardScreen from './component/whiteboard/WhiteboardScreen';
// Parent components
import ParentLoginScreen from './component/parent/ParentLoginScreen';
import ParentChangePasswordScreen from './component/parent/ParentChangePasswordScreen';
import ParentDashboardScreen from './component/parent/ParentDashboardScreen';
import ParentFeedbackScreen from './component/parent/ParentFeedbackScreen';
import ParentProfileScreen from './component/parent/ParentProfileScreen';
import type {CreateWhiteboardRoomResponse} from './api/whiteboard/types';
// Admin components
import AdminDashboard from './component/admin/AdminDashboard';
import ManageTeachersScreen from './component/admin/ManageTeachersScreen';
import TeacherEnrollmentHubScreen from './component/admin/TeacherEnrollmentHubScreen';
import TeacherApprovalScreen from './component/admin/TeacherApprovalScreen';
import AdminTeacherDetailScreen from './component/admin/TeacherDetailScreen';
import StudentListScreen from './component/admin/StudentListScreen';
import StudentDetailScreen from './component/admin/StudentDetailScreen';
// Chat components
import ChatContainer from './component/chat/ChatContainer';
// Navigation
import BottomNavBar from './component/navigation/BottomNavBar';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentScreen, setCurrentScreen] = useState<
    | 'login'
    | 'signup'
    | 'forgotPassword'
    | 'teacherDashboard'
    | 'teacherProfile'
    | 'teacherProfileWizard'
    | 'teacherProfileStatus'
    | 'teacherMessages'
    | 'teacherList'
    | 'teacherEnrollmentRequests'
    | 'teacherStudents'
    | 'teacherStudentsList'
    | 'teacherStudentPortal'
    | 'teacherGroupAttendance'
    | 'teacherStudentsBySubject'
    | 'teacherVideoClass'
    | 'teacherVideoRoom'
    | 'teacherAssistant'
    | 'studentDashboard'
    | 'studentJoinClass'
    | 'studentVideoRoom'
    | 'studentProfile'
    | 'studentProfileEdit'
    | 'tutorMap'
    | 'teacherDetail'
    | 'chat'
    | 'portal'
    | 'parentLogin'
    | 'parentChangePassword'
    | 'parentDashboard'
    | 'parentFeedback'
    | 'parentProfile'
    | 'teacherAddParent'
    | 'adminDashboard'
    | 'manageTeachers'
    | 'allTeachers'
    | 'teacherApproval'
    | 'studentList'
    | 'studentDetail'
    | 'whiteboard'
  >('login');
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'students' | 'video' | 'portal' | 'profile' | 'dashboard' | 'feedback'>('home');
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin' | 'parent' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // Video call state
  const [videoCallData, setVideoCallData] = useState<{
    callId: number;
    token: string;
    channelName: string;
    uid: number;
    role: 'teacher' | 'student';
    isMinimized?: boolean;
  } | null>(null);
  const [whiteboardSession, setWhiteboardSession] = useState<{
    session: CreateWhiteboardRoomResponse;
    videoCallId: number;
    role: 'teacher' | 'student';
  } | null>(null);
  const [whiteboardMinimized, setWhiteboardMinimized] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const minimizedPosition = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
  const minimizedPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        minimizedPosition.setOffset({
          x: (minimizedPosition.x as any)._value,
          y: (minimizedPosition.y as any)._value,
        });
        minimizedPosition.setValue({x: 0, y: 0});
      },
      onPanResponderMove: Animated.event(
        [null, {dx: minimizedPosition.x, dy: minimizedPosition.y}],
        {useNativeDriver: false},
      ),
      onPanResponderRelease: () => {
        minimizedPosition.flattenOffset();
      },
    }),
  ).current;

  useEffect(() => {
    let mounted = true;

    const loadUserName = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (!userStr) {
          return;
        }
        const userData = JSON.parse(userStr);
        const firstName = userData?.first_name?.trim();
        const lastName = userData?.last_name?.trim();
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        const fallback = userData?.name || userData?.email?.split('@')?.[0] || '';
        if (mounted) {
          setCurrentUserName(fullName || fallback || '');
        }
      } catch (error) {
        console.log('[APP] Failed to load user name:', error);
      }
    };

    loadUserName();

    return () => {
      mounted = false;
    };
  }, [currentUserId]);
  
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedPortalType, setSelectedPortalType] = useState<'attendance' | 'marks'>('attendance');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [chatOtherUserName, setChatOtherUserName] = useState<string | null>(null);
  const [chatOtherUserAvatar, setChatOtherUserAvatar] = useState<string | null>(null);
  const [chatReturnScreen, setChatReturnScreen] = useState<
    'teacherMessages' | 'teacherDetail' | 'studentDashboard' | 'teacherDashboard' | null
  >(null);
  const [teacherDetailReturnScreen, setTeacherDetailReturnScreen] = useState<
    'studentDashboard' | 'allTeachers' | null
  >(null);

  // Check if we should show bottom nav bar
  const showBottomNav = userRole && [
    'teacherDashboard', 
    'studentDashboard', 
    'teacherMessages',
    'teacherProfile',
    'studentProfile',
    'portal',
    'teacherList',
    'teacherStudents',
    'teacherStudentsList',
    'teacherStudentsBySubject',
    'teacherVideoClass',
    'studentJoinClass',
    'parentDashboard',
    'parentFeedback',
    'parentProfile',
  ].includes(currentScreen);

  // Handle bottom tab press
  const handleTabPress = (tabId: 'home' | 'chat' | 'students' | 'video' | 'portal' | 'profile' | 'dashboard' | 'feedback') => {
    setActiveTab(tabId);

    if (userRole === 'parent') {
      switch (tabId) {
        case 'dashboard':
          setCurrentScreen('parentDashboard');
          break;
        case 'feedback':
          setCurrentScreen('parentFeedback');
          break;
        case 'profile':
          setCurrentScreen('parentProfile');
          break;
      }
      return;
    }

    if (userRole === 'student') {
      switch (tabId) {
        case 'home':
          setCurrentScreen('studentDashboard');
          break;
        case 'chat':
          setCurrentScreen('teacherMessages'); // or student messages
          break;
        case 'video':
          setCurrentScreen('studentJoinClass');
          break;
        case 'portal':
          setCurrentScreen('portal');
          break;
        case 'profile':
          setCurrentScreen('studentProfile');
          break;
      }
    } else if (userRole === 'teacher') {
      switch (tabId) {
        case 'home':
          setCurrentScreen('teacherDashboard');
          break;
        case 'students':
          setCurrentScreen('teacherStudents');
          break;
        case 'chat':
          setCurrentScreen('teacherMessages');
          break;
        case 'video':
          setCurrentScreen('teacherVideoClass');
          break;
        case 'portal':
          setCurrentScreen('teacherEnrollmentRequests');
          break;
        case 'profile':
          setCurrentScreen('teacherProfile');
          break;
      }
    }
  };

  const navigateToSignup = () => {
    setCurrentScreen('signup');
  };

  const navigateToLogin = () => {
    setCurrentScreen('login');
    setCurrentUserId(null);
    setUserRole(null);
    setShowLogoutModal(false);
  };

  const requestLogout = () => {
    setShowLogoutModal(true);
  };

  const navigateToForgotPassword = () => {
    setCurrentScreen('forgotPassword');
  };

  const navigateToTeacherDashboard = (userId: number, role: string) => {
    setCurrentUserId(userId);
    setUserRole('teacher');
    setActiveTab('home');
    setCurrentScreen('teacherDashboard');
  };

  const navigateToStudentDashboard = (userId: number, role: string) => {
    setCurrentUserId(userId);
    setUserRole('student');
    setActiveTab('home');
    setCurrentScreen('studentDashboard');
  };

  const navigateToAdminDashboard = (userId: number, role: string) => {
    setCurrentUserId(userId);
    setUserRole('admin');
    setCurrentScreen('adminDashboard');
  };

  const navigateToParentLogin = () => {
    setCurrentScreen('parentLogin');
  };

  const navigateToParentDashboard = () => {
    setUserRole('parent');
    setActiveTab('dashboard');
    setCurrentScreen('parentDashboard');
  };

  const handleParentLoginSuccess = (_userId?: number, mustChangePassword?: boolean) => {
    setUserRole('parent');
    if (mustChangePassword) {
      navigateToParentChangePassword();
      return;
    }
    navigateToParentDashboard();
  };

  const navigateToParentChangePassword = () => {
    setUserRole('parent');
    setCurrentScreen('parentChangePassword');
  };

  const navigateToTeacherAddParent = () => {
    setCurrentScreen('teacherAddParent');
  };

  const navigateToTeacherAssistant = () => {
    setCurrentScreen('teacherAssistant');
  };

  const navigateToManageTeachers = () => {
    setCurrentScreen('manageTeachers');
  };

  const navigateToAllTeachers = () => {
    setCurrentScreen('allTeachers');
  };

  const navigateToTeacherApproval = (teacherId?: number) => {
    setCurrentScreen('teacherApproval');
    if (teacherId) {
      setSelectedTeacherId(teacherId);
    }
  };

  const navigateToStudentList = () => {
    setCurrentScreen('studentList');
  };

  const navigateToStudentDetail = (studentId: number) => {
    setSelectedStudentId(studentId);
    setCurrentScreen('studentDetail');
  };

  const handleBackFromStudentDetail = () => {
    setSelectedStudentId(null);
    setCurrentScreen('studentList');
  };



  const handleBackToAdminDashboard = () => {
    setCurrentScreen('adminDashboard');
  };

  const navigateToTeacherProfile = () => {
    setCurrentScreen('teacherProfile');
  };

  const navigateToTeacherProfileWizard = () => {
    setCurrentScreen('teacherProfileWizard');
  };

  const navigateToTeacherProfileStatus = () => {
    setCurrentScreen('teacherProfileStatus');
  };

  const navigateToTeacherEnrollmentRequests = () => {
    setCurrentScreen('teacherEnrollmentRequests');
  };

  const handleBackFromTeacherEnrollmentRequests = () => {
    setCurrentScreen('teacherDashboard');
  };

  const navigateToTeacherStudents = () => {
    setCurrentScreen('teacherStudentsList');
  };

  const handleBackFromTeacherStudentsList = () => {
    setCurrentScreen('teacherDashboard');
  };

  const handleBackFromTeacherStudents = () => {
    setCurrentScreen('teacherDashboard');
  };

  const openTeacherStudentPortal = (student: any, portalType: 'attendance' | 'marks') => {
    setSelectedStudent(student);
    setSelectedPortalType(portalType);
    setCurrentScreen('teacherStudentPortal');
  };

  const handleBackFromTeacherStudentPortal = () => {
    setCurrentScreen('teacherStudents');
  };

  const openTeacherGroupAttendancePortal = (
    subject: any,
    portalType: 'attendance' | 'marks' = 'attendance'
  ) => {
    setSelectedSubject(subject);
    setSelectedPortalType(portalType);
    setCurrentScreen('teacherGroupAttendance');
  };

  const handleBackFromTeacherGroupAttendance = () => {
    setCurrentScreen('teacherStudents');
  };

  const navigateToTeacherStudentsBySubject = () => {
    setCurrentScreen('teacherStudentsBySubject');
  };

  const handleBackFromTeacherStudentsBySubject = () => {
    setCurrentScreen('teacherDashboard');
  };

  const navigateToTeacherVideoClass = () => {
    setCurrentScreen('teacherVideoClass');
    setActiveTab('video');
  };

  const handleBackFromTeacherVideoClass = () => {
    setCurrentScreen('teacherDashboard');
    setActiveTab('home');
  };

  const navigateToTeacherVideoRoom = (callData: {
    callId: number;
    token: string;
    channelName: string;
    uid: number;
  }) => {
    setVideoCallData({...callData, role: 'teacher', isMinimized: false});
    setCurrentScreen('teacherVideoRoom');
  };

  const handleBackFromTeacherVideoRoom = () => {
    setVideoCallData(null);
    setCurrentScreen('teacherVideoClass');
  };

  const navigateToStudentJoinClass = () => {
    setCurrentScreen('studentJoinClass');
    setActiveTab('video');
  };

  const handleBackFromStudentJoinClass = () => {
    setCurrentScreen('studentDashboard');
    setActiveTab('home');
  };

  const navigateToStudentVideoRoom = (callData: {
    callId: number;
    token: string;
    channelName: string;
    uid: number;
  }) => {
    setVideoCallData({...callData, role: 'student', isMinimized: false});
    setCurrentScreen('studentVideoRoom');
  };

  const handleBackFromStudentVideoRoom = () => {
    setVideoCallData(null);
    setCurrentScreen('studentJoinClass');
  };

  const handleMinimizeTeacherCall = () => {
    setVideoCallData(prev => (prev ? {...prev, isMinimized: true, role: 'teacher'} : prev));
    setCurrentScreen('teacherDashboard');
  };

  const handleMinimizeStudentCall = () => {
    setVideoCallData(prev => (prev ? {...prev, isMinimized: true, role: 'student'} : prev));
    setCurrentScreen('studentDashboard');
  };

  const handleRestoreCall = () => {
    if (!videoCallData) return;
    setVideoCallData(prev => (prev ? {...prev, isMinimized: false} : prev));
    if (videoCallData.role === 'teacher') {
      setCurrentScreen('teacherVideoRoom');
    } else if (videoCallData.role === 'student') {
      setCurrentScreen('studentVideoRoom');
    }
  };

  const handleOpenWhiteboard = (session: CreateWhiteboardRoomResponse, callId: number) => {
    const role = videoCallData?.role || 'teacher';
    setWhiteboardSession({session, videoCallId: callId, role});
    setWhiteboardMinimized(false);
    setVideoCallData(prev => (prev ? {...prev, isMinimized: true} : prev));
    setCurrentScreen('whiteboard');
  };

  const handleBackFromWhiteboard = () => {
    if (whiteboardSession?.role === 'student') {
      setWhiteboardMinimized(true);
      if (videoCallData) {
        handleRestoreCall();
      } else {
        setCurrentScreen('studentDashboard');
      }
      return;
    }
    setWhiteboardSession(null);
    setWhiteboardMinimized(false);
    if (videoCallData) {
      handleRestoreCall();
    } else {
      setCurrentScreen('teacherDashboard');
    }
  };

  const handleReturnToWhiteboard = () => {
    if (!whiteboardSession) {
      return;
    }
    setWhiteboardMinimized(false);
    setVideoCallData(prev => (prev ? {...prev, isMinimized: true} : prev));
    setCurrentScreen('whiteboard');
  };

  const handleStudentClick = (student: any, portalType: 'attendance' | 'marks' = 'attendance') => {
    openTeacherStudentPortal(student, portalType);
  };

  const navigateToStudentProfile = () => {
    setCurrentScreen('studentProfile');
  };

  const navigateToStudentProfileEdit = () => {
    setCurrentScreen('studentProfileEdit');
  };

  const navigateToTutorMap = () => {
    setCurrentScreen('tutorMap');
  };

  const navigateBackToDashboard = () => {
    if (currentScreen === 'teacherProfile' || currentScreen === 'teacherProfileWizard') {
      setCurrentScreen('teacherDashboard');
    } else if (currentScreen === 'studentProfile') {
      setCurrentScreen('studentDashboard');
    }
  };

  // Student: open teacher detail screen
  const openTeacherDetail = (teacherId: number) => {
    setSelectedTeacherId(teacherId);
    setTeacherDetailReturnScreen('studentDashboard');
    setCurrentScreen('teacherDetail');
  };

  // Admin: open teacher detail from AllTeachersScreen
  const openTeacherDetailFromAllTeachers = (teacherId: number) => {
    setSelectedTeacherId(teacherId);
    setTeacherDetailReturnScreen('allTeachers');
    setCurrentScreen('teacherDetail');
  };

  // Handle back from teacher detail
  const handleTeacherDetailBack = () => {
    const returnScreen = teacherDetailReturnScreen || 'studentDashboard';
    setCurrentScreen(returnScreen as any);
    setSelectedTeacherId(null);
    setTeacherDetailReturnScreen(null);
  };

  // Teacher: open messages list
  const openTeacherMessages = () => {
    setCurrentScreen('teacherMessages');
  };

  // Open chat from messages list (teacher flow)
  const openChatFromMessages = (
    conversationId: number,
    otherUserName?: string,
    otherUserAvatar?: string | null,
  ) => {
    setSelectedConversationId(conversationId);
    setChatOtherUserName(otherUserName || null);
    setChatOtherUserAvatar(otherUserAvatar ?? null);
    setChatReturnScreen('teacherMessages');
    setCurrentScreen('chat');
  };

  // Open chat from teacher detail (student flow)
  const openChatFromTeacherDetail = (
    conversationId: number,
    teacherName?: string,
    teacherAvatar?: string | null,
  ) => {
    setSelectedConversationId(conversationId);
    setChatOtherUserName(teacherName || null);
    setChatOtherUserAvatar(teacherAvatar ?? null);
    setChatReturnScreen('studentDashboard');
    setCurrentScreen('chat');
  };

  // Handle back from chat
  const handleChatBack = () => {
    setCurrentScreen(chatReturnScreen || 'studentDashboard');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.appShell}>
        <AppStatusBar />
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
          <View style={styles.screenContainer}>
          {currentScreen === 'login' ? (
            <LoginScreen
              onNavigateToSignup={navigateToSignup}
              onNavigateToForgotPassword={navigateToForgotPassword}
              onNavigateToParentPortal={navigateToParentLogin}
              onLoginSuccess={(userId, role, options) => {
                if (role === 'teacher') {
                  navigateToTeacherDashboard(userId, role);
                } else if (role === 'student') {
                  navigateToStudentDashboard(userId, role);
                } else if (role === 'admin') {
                  navigateToAdminDashboard(userId, role);
                } else if (role === 'parent') {
                  handleParentLoginSuccess(userId, options?.mustChangePassword);
                }
              }}
            />
          ) : currentScreen === 'signup' ? (
            <SignupScreen onNavigateToLogin={navigateToLogin} />
          ) : currentScreen === 'forgotPassword' ? (
            <ForgotPasswordScreen onNavigateToLogin={navigateToLogin} />
          ) : currentScreen === 'parentLogin' ? (
            <ParentLoginScreen
              onBackToLogin={navigateToLogin}
              onNavigateToChangePassword={navigateToParentChangePassword}
              onLoginSuccess={(_parentId, mustChangePassword) =>
                handleParentLoginSuccess(undefined, mustChangePassword)
              }
            />
          ) : currentScreen === 'parentChangePassword' ? (
            <ParentChangePasswordScreen
              onBackToLogin={navigateToParentLogin}
              onComplete={navigateToParentDashboard}
            />
          ) : currentScreen === 'parentDashboard' ? (
            <ParentDashboardScreen
              onLogout={requestLogout}
              onChangePassword={navigateToParentChangePassword}
            />
          ) : currentScreen === 'parentFeedback' ? (
            <ParentFeedbackScreen />
          ) : currentScreen === 'parentProfile' ? (
            <ParentProfileScreen
              onLogout={requestLogout}
              onChangePassword={navigateToParentChangePassword}
            />
          ) : currentScreen === 'teacherAddParent' ? (
            <TeacherAddParentScreen onBack={() => setCurrentScreen('teacherDashboard')} />
          ) : currentScreen === 'teacherAssistant' ? (
            <TeacherAssistantScreen onBack={() => setCurrentScreen('teacherDashboard')} />
          ) : currentScreen === 'teacherDashboard' ? (
            <TeacherDashboard
              onNavigateToProfile={() => handleTabPress('profile')}
              onNavigateToCompleteProfile={navigateToTeacherProfileWizard}
              onLogout={requestLogout}
              onNavigateToMessages={() => handleTabPress('chat')}
              onNavigateToProfileStatus={navigateToTeacherProfileStatus}
              onNavigateToEnrollmentRequests={navigateToTeacherEnrollmentRequests}
              onNavigateToStudents={navigateToTeacherStudents}
              onNavigateToStudentsBySubject={navigateToTeacherStudentsBySubject}
              onNavigateToVideoClass={navigateToTeacherVideoClass}
              onNavigateToAddParent={navigateToTeacherAddParent}
              onNavigateToAssistant={navigateToTeacherAssistant}
            />
          ) : currentScreen === 'teacherProfile' ? (
            <TeacherProfileSettings
              onBack={() => handleTabPress('home')}
              userId={currentUserId}
              onLogout={navigateToLogin}
              onNavigateToWizard={navigateToTeacherProfileWizard}
            />
          ) : currentScreen === 'teacherProfileWizard' && currentUserId ? (
            <TeacherProfileWizard
              userId={currentUserId}
              onComplete={() => setCurrentScreen('teacherDashboard')}
              onBack={() => setCurrentScreen('teacherDashboard')}
            />
          ) : currentScreen === 'teacherProfileStatus' ? (
            <TeacherProfileStatusScreen
              onNavigateToDashboard={() => setCurrentScreen('teacherDashboard')}
              onNavigateToEditProfile={navigateToTeacherProfileWizard}
              onLogout={requestLogout}
            />
          ) : currentScreen === 'teacherEnrollmentRequests' ? (
            <TeacherEnrollmentRequestsScreen
              onBack={handleBackFromTeacherEnrollmentRequests}
            />
          ) : currentScreen === 'teacherStudents' ? (
            <TeacherStudentsBySubjectScreen
              onBack={handleBackFromTeacherStudents}
              onStudentPress={handleStudentClick}
              onOpenGroupAttendance={openTeacherGroupAttendancePortal}
            />
          ) : currentScreen === 'teacherStudentsList' ? (
            <TeacherStudentsScreen
              onBack={handleBackFromTeacherStudentsList}
              onStudentPress={handleStudentClick}
            />
          ) : currentScreen === 'teacherStudentPortal' && selectedStudent ? (
            <TeacherStudentPortalScreen
              student={selectedStudent}
              portalType={selectedPortalType}
              portalMode="single"
              onBack={handleBackFromTeacherStudentPortal}
            />
          ) : currentScreen === 'teacherGroupAttendance' && selectedSubject ? (
            <TeacherStudentPortalScreen
              subject={selectedSubject}
              portalType={selectedPortalType}
              portalMode="group"
              onBack={handleBackFromTeacherGroupAttendance}
            />
          ) : currentScreen === 'teacherStudentsBySubject' ? (
            <TeacherStudentsBySubjectScreen
              onBack={handleBackFromTeacherStudentsBySubject}
              onStudentPress={handleStudentClick}
              onOpenGroupAttendance={openTeacherGroupAttendancePortal}
              entryMode="subjects"
            />
          ) : currentScreen === 'teacherVideoClass' ? (
            <TeacherVideoClassScreen 
              onBack={handleBackFromTeacherVideoClass}
              onNavigateToRoom={navigateToTeacherVideoRoom}
            />
          ) : currentScreen === 'teacherVideoRoom' && videoCallData ? (
            <TeacherVideoCallRoomScreen
              callId={videoCallData.callId}
              token={videoCallData.token}
              channelName={videoCallData.channelName}
              uid={videoCallData.uid}
              onBack={handleBackFromTeacherVideoRoom}
              onMinimize={handleMinimizeTeacherCall}
              isMinimized={!!videoCallData.isMinimized}
              onRestore={handleRestoreCall}
              onOpenWhiteboard={handleOpenWhiteboard}
            />
          ) : currentScreen === 'studentDashboard' ? (
            <StudentDashboard
              onNavigateToProfile={() => handleTabPress('profile')}
              onLogout={requestLogout}
              onOpenTeacherDetail={openTeacherDetail}
              onNavigateToJoinClass={navigateToStudentJoinClass}
              onNavigateToTutorMap={navigateToTutorMap}
            />
          ) : currentScreen === 'tutorMap' ? (
            <TutorMapScreen onBack={() => setCurrentScreen('studentDashboard')} />
          ) : currentScreen === 'studentJoinClass' ? (
            <StudentJoinClassScreen 
              onBack={handleBackFromStudentJoinClass}
              onNavigateToRoom={navigateToStudentVideoRoom}
            />
          ) : currentScreen === 'studentVideoRoom' && videoCallData ? (
            <StudentVideoCallRoomScreen
              callId={videoCallData.callId}
              token={videoCallData.token}
              channelName={videoCallData.channelName}
              uid={videoCallData.uid}
              onBack={handleBackFromStudentVideoRoom}
              onMinimize={handleMinimizeStudentCall}
              isMinimized={!!videoCallData.isMinimized}
              onRestore={handleRestoreCall}
              onOpenWhiteboard={handleOpenWhiteboard}
              isWhiteboardOpen={currentScreen === 'whiteboard'}
              isWhiteboardMinimized={whiteboardMinimized}
              hasActiveWhiteboard={!!whiteboardSession}
              onReturnToWhiteboard={handleReturnToWhiteboard}
            />
          ) : currentScreen === 'whiteboard' && whiteboardSession ? (
            <WhiteboardScreen
              url={whiteboardSession.session.url}
              roomId={whiteboardSession.session.roomId}
              roomKey={whiteboardSession.session.roomKey}
              videoCallId={whiteboardSession.videoCallId}
              canEnd={whiteboardSession.role === 'teacher'}
              followActive={whiteboardSession.role === 'student'}
              displayName={currentUserName}
              roleLabel={whiteboardSession.role === 'teacher' ? 'Teacher' : 'Student'}
              onBack={handleBackFromWhiteboard}
            />
          ) : currentScreen === 'studentProfile' ? (
            <StudentProfileSettings
              onBack={() => handleTabPress('home')}
              userId={currentUserId}
              onLogout={navigateToLogin}
              onEditProfile={navigateToStudentProfileEdit}
            />
          ) : currentScreen === 'studentProfileEdit' ? (
            <StudentProfileEdit
              userId={currentUserId}
              onBack={() => setCurrentScreen('studentProfile')}
              onSaveSuccess={() => setCurrentScreen('studentProfile')}
            />
          ) : currentScreen === 'teacherMessages' ? (
            <TeacherMessagesScreen
              onBack={() => handleTabPress('home')}
              onOpenChat={openChatFromMessages}
            />
          ) : currentScreen === 'teacherDetail' && selectedTeacherId ? (
            teacherDetailReturnScreen === 'allTeachers' ? (
              <AdminTeacherDetailScreen
                teacherId={selectedTeacherId}
                onBack={handleTeacherDetailBack}
              />
            ) : (
              <TeacherDetailScreen
                teacherId={selectedTeacherId}
                onBack={handleTeacherDetailBack}
                onChatCreated={openChatFromTeacherDetail}
              />
            )
          ) : currentScreen === 'chat' && selectedConversationId ? (
            <ChatContainer
              conversationId={selectedConversationId}
              otherUserName={chatOtherUserName || undefined}
              otherUserAvatar={chatOtherUserAvatar}
              onBack={handleChatBack}
            />
          ) : currentScreen === 'teacherList' ? (
            <TeacherListScreen
              onSelectTeacher={openTeacherDetail}
              onBack={() => setCurrentScreen('studentDashboard')}
            />
          ) : currentScreen === 'portal' ? (
            <StudentPortalScreen onBack={() => handleTabPress('home')} />
          ) : currentScreen === 'adminDashboard' ? (
            <AdminDashboard 
              onLogout={requestLogout}
              onNavigateToTeachers={navigateToManageTeachers}
              onNavigateToAllTeachers={navigateToAllTeachers}
              onNavigateToStudents={navigateToStudentList}
            />
          ) : currentScreen === 'manageTeachers' ? (
            <ManageTeachersScreen onBack={() => setCurrentScreen('adminDashboard')} />
          ) : currentScreen === 'allTeachers' ? (
            <TeacherEnrollmentHubScreen 
              onBack={() => setCurrentScreen('adminDashboard')}
            />
          ) : currentScreen === 'teacherApproval' && selectedTeacherId ? (
            <TeacherApprovalScreen
              teacherId={selectedTeacherId}
              onBack={handleBackToAdminDashboard}
              onApprovalComplete={handleBackToAdminDashboard}
            />
          ) : currentScreen === 'studentList' ? (
            <StudentListScreen onBack={handleBackToAdminDashboard} onOpenStudent={navigateToStudentDetail} />
          ) : currentScreen === 'studentDetail' && selectedStudentId ? (
            <StudentDetailScreen studentId={selectedStudentId} onBack={handleBackFromStudentDetail} />
          ) : null}

          {/* Bottom Navigation Bar */}
          {showBottomNav && (
            <BottomNavBar
              activeTab={activeTab}
              onTabPress={handleTabPress}
              userRole={userRole || 'student'}
            />
          )}

          {videoCallData?.isMinimized && (
            <Animated.View
              style={[styles.minimizedWrapper, {transform: minimizedPosition.getTranslateTransform()}]}
              {...minimizedPanResponder.panHandlers}>
              {videoCallData.role === 'teacher' ? (
                <TeacherVideoCallRoomScreen
                  callId={videoCallData.callId}
                  token={videoCallData.token}
                  channelName={videoCallData.channelName}
                  uid={videoCallData.uid}
                  onBack={handleBackFromTeacherVideoRoom}
                  onRestore={handleRestoreCall}
                  isMinimized
                />
              ) : (
                <StudentVideoCallRoomScreen
                  callId={videoCallData.callId}
                  token={videoCallData.token}
                  channelName={videoCallData.channelName}
                  uid={videoCallData.uid}
                  onBack={handleBackFromStudentVideoRoom}
                  onRestore={handleRestoreCall}
                  isMinimized
                  isWhiteboardOpen={currentScreen === 'whiteboard'}
                />
              )}
              <TouchableOpacity style={styles.minimizedBadge} onPress={handleRestoreCall}>
                <Text style={styles.minimizedBadgeText}>Return to live class</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <Modal
            visible={showLogoutModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLogoutModal(false)}>
            <View style={styles.logoutOverlay}>
              <View style={styles.logoutCard}>
                <Text style={styles.logoutTitle}>Logout?</Text>
                <Text style={styles.logoutText}>
                  Are you sure you want to logout from your account?
                </Text>
                <View style={styles.logoutActions}>
                  <TouchableOpacity
                    style={styles.logoutCancelBtn}
                    activeOpacity={0.85}
                    onPress={() => setShowLogoutModal(false)}>
                    <Text style={styles.logoutCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.logoutConfirmBtn}
                    activeOpacity={0.85}
                    onPress={navigateToLogin}>
                    <Text style={styles.logoutConfirmText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screenContainer: {
    flex: 1,
  },
  portalPlaceholder: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  minimizedWrapper: {
    position: 'absolute',
    width: 200,
    height: 150,
    bottom: 90,
    right: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
  },
  minimizedBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15,118,110,0.9)',
    borderRadius: 10,
    alignItems: 'center',
  },
  minimizedBadgeText: {
    color: '#E2F3F1',
    fontWeight: '700',
    fontSize: 13,
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  logoutCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10284C',
    textAlign: 'center',
  },
  logoutText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  logoutActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  logoutCancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutCancelText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
  logoutConfirmBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default App;
