#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RestTimerLiveActivity, NSObject)

RCT_EXTERN_METHOD(startRestTimer:(nonnull NSNumber *)totalSeconds
                  exerciseName:(NSString * _Nullable)exerciseName)

RCT_EXTERN_METHOD(updateRestTimer:(nonnull NSNumber *)remainingSeconds
                  exerciseName:(NSString * _Nullable)exerciseName)

RCT_EXTERN_METHOD(endRestTimer)

@end
