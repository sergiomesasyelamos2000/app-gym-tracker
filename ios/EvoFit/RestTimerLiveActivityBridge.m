#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RestTimerLiveActivity, NSObject)

RCT_EXTERN_METHOD(startRestTimer:(nonnull NSNumber *)totalSeconds
                  exerciseName:(NSString * _Nullable)exerciseName
                  imageUrl:(NSString * _Nullable)imageUrl
                  nextSetSummary:(NSString * _Nullable)nextSetSummary)

RCT_EXTERN_METHOD(updateRestTimer:(nonnull NSNumber *)remainingSeconds
                  exerciseName:(NSString * _Nullable)exerciseName
                  imageUrl:(NSString * _Nullable)imageUrl
                  nextSetSummary:(NSString * _Nullable)nextSetSummary)

RCT_EXTERN_METHOD(endRestTimer)

@end

#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(RestTimerLiveActivityModule, RCTEventEmitter)

RCT_EXTERN_METHOD(supportedEventsList:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
