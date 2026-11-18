import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface StarRatingProps {
  rating: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  editable?: boolean;
  onChange?: (rating: number) => void;
  gap?: number;
}

const StarRating = ({
  rating,
  size = 18,
  color = '#FFC44D',
  emptyColor = '#D7E0EC',
  editable = false,
  onChange,
  gap = 4,
}: StarRatingProps) => {
  return (
    <View style={[styles.row, {gap}]}>
      {[1, 2, 3, 4, 5].map(value => {
        let iconName: string = 'star-outline';
        if (rating >= value) {
          iconName = 'star';
        } else if (rating >= value - 0.5) {
          iconName = 'star-half';
        }

        const star = (
          <Ionicons
            name={iconName}
            size={size}
            color={rating >= value - 0.5 ? color : emptyColor}
          />
        );

        if (!editable) {
          return <View key={value}>{star}</View>;
        }

        return (
          <TouchableOpacity
            key={value}
            onPress={() => onChange?.(value)}
            activeOpacity={0.7}
            hitSlop={{top: 6, bottom: 6, left: 4, right: 4}}>
            {star}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
});

export default StarRating;
