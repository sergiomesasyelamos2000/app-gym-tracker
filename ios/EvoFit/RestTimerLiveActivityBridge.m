#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// MARK: - RestTimerLiveActivity

@interface RCT_EXTERN_MODULE(RestTimerLiveActivity, NSObject)

RCT_EXTERN_METHOD(startRestTimer:(nonnull NSNumber *)endTimestampMs
                  exerciseName:(NSString * _Nullable)exerciseName
                  imageUrl:(NSString * _Nullable)imageUrl
                  nextSetSummary:(NSString * _Nullable)nextSetSummary)

RCT_EXTERN_METHOD(updateRestTimer:(nonnull NSNumber *)endTimestampMs
                  exerciseName:(NSString * _Nullable)exerciseName
                  imageUrl:(NSString * _Nullable)imageUrl
                  nextSetSummary:(NSString * _Nullable)nextSetSummary)

RCT_EXTERN_METHOD(endRestTimer)

RCT_EXTERN_METHOD(getCurrentRestTimerState:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

// MARK: - RestTimerLiveActivityModule

@interface RCT_EXTERN_MODULE(RestTimerLiveActivityModule, RCTEventEmitter)

RCT_EXTERN_METHOD(pollPendingIntent:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(supportedEventsList:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end