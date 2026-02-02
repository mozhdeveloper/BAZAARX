declare module '@ptomasroos/react-native-multi-slider' {
  import { Component } from 'react';
  import { StyleProp, ViewStyle, TextStyle } from 'react-native';

  export interface MultiSliderProps {
    values?: number[];
    onValuesChange?: (values: number[]) => void;
    onValuesChangeStart?: () => void;
    onValuesChangeFinish?: (values: number[]) => void;
    sliderLength?: number;
    touchDimensions?: {
      height?: number;
      width?: number;
      borderRadius?: number;
      slipDisplacement?: number;
    };
    customMarker?: React.ComponentType<any>;
    customMarkerLeft?: React.ComponentType<any>;
    customMarkerRight?: React.ComponentType<any>;
    isMarkersSeparated?: boolean;
    min?: number;
    max?: number;
    step?: number;
    optionsArray?: number[];
    containerStyle?: StyleProp<ViewStyle>;
    trackStyle?: StyleProp<ViewStyle>;
    selectedStyle?: StyleProp<ViewStyle>;
    unselectedStyle?: StyleProp<ViewStyle>;
    markerContainerStyle?: StyleProp<ViewStyle>;
    markerStyle?: StyleProp<ViewStyle>;
    pressedMarkerStyle?: StyleProp<ViewStyle>;
    valuePrefix?: string;
    valueSuffix?: string;
    enabledOne?: boolean;
    enabledTwo?: boolean;
    onToggleOne?: () => void;
    onToggleTwo?: () => void;
    allowOverlap?: boolean;
    snapped?: boolean;
    vertical?: boolean;
    markerOffsetX?: number;
    markerOffsetY?: number;
    minMarkerOverlapDistance?: number;
    imageBackgroundSource?: string;
    enableLabel?: boolean;
    customLabel?: React.ComponentType<any>;
  }

  export default class MultiSlider extends Component<MultiSliderProps> {}
}
