import type { ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export function DraggableTodoSurface({
  children,
  enabled,
  onDrop,
  onDragFinish,
  onDragStart,
}: {
  children: ReactNode;
  enabled: boolean;
  onDrop: (absoluteX: number, absoluteY: number) => void;
  onDragFinish: () => void;
  onDragStart: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragging = useSharedValue(0);
  const gesture = Gesture.Pan()
    .enabled(enabled)
    .activateAfterLongPress(350)
    .onStart(() => {
      dragging.value = 1;
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      runOnJS(onDrop)(event.absoluteX, event.absoluteY);
    })
    .onFinalize(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      dragging.value = 0;
      runOnJS(onDragFinish)();
    });
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: dragging.value ? 0.88 : 1,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    zIndex: dragging.value ? 30 : 0,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
