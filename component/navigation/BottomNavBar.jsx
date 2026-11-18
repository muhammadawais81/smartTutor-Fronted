import React, {useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';

// Navigation items for Student
const STUDENT_TABS = [
  {id: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home'},
  {id: 'chat', label: 'Chat', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses'},
  {id: 'video', label: 'Class', icon: 'videocam-outline', activeIcon: 'videocam'},
  {id: 'portal', label: 'Portal', icon: 'people-outline', activeIcon: 'people'},
  {id: 'profile', label: 'Profile', icon: 'person-circle-outline', activeIcon: 'person-circle'},
];

// Navigation items for Teacher - with Students tab for enrollment/attendance management
const TEACHER_TABS = [
  {id: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home'},
  {id: 'students', label: 'Students', icon: 'school-outline', activeIcon: 'school'},
  {id: 'chat', label: 'Messages', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses'},
  {id: 'video', label: 'Class', icon: 'people-outline', activeIcon: 'people'},
  {id: 'profile', label: 'Profile', icon: 'person-circle-outline', activeIcon: 'person-circle'},
];

// Navigation items for Parent
const PARENT_TABS = [
  {id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid'},
  {id: 'feedback', label: 'Feedback', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles'},
  {id: 'profile', label: 'Profile', icon: 'person-circle-outline', activeIcon: 'person-circle'},
];

const getTabsForRole = role => {
  if (role === 'teacher') {
    return TEACHER_TABS;
  }
  if (role === 'parent') {
    return PARENT_TABS;
  }
  return STUDENT_TABS;
};

const BottomNavBar = ({
  activeTab = 'home',
  onTabPress,
  userRole = 'student',
}) => {
  const tabs = getTabsForRole(userRole);
  const scaleAnims = useRef(tabs.map(() => new Animated.Value(1))).current;

  const handleTabPress = (tabId, index) => {
    // Bounce animation on press
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
    
    onTabPress?.(tabId);
  };

  return (
    <SafeAreaView edges={[]} style={styles.container}>
      <View style={styles.bar}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const iconName = isActive ? tab.activeIcon || tab.icon : tab.icon;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.id, index)}
              activeOpacity={0.7}>
              <Animated.View
                style={[
                  styles.iconWrapper,
                  isActive && styles.iconWrapperActive,
                  {transform: [{scale: scaleAnims[index]}]}
                ]}>
                <Ionicons
                  name={iconName}
                  color={isActive ? '#ffffff' : '#10284C'}
                  size={24}
                />
              </Animated.View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    height: 74,
    paddingTop: 6,
    shadowColor: 'rgb(250, 247, 247)',
    shadowOffset: {width: 0, height: -3},
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 15,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapperActive: {
    backgroundColor: '#10284C',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#10284C',
    marginTop: 4,
  },
  labelActive: {
    color: '#10284C',
    fontWeight: '700',
  },
});

export default BottomNavBar;
