#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(RestTimerLiveActivity, NSObject)

RCT_EXTERN_METHOD(startWorkoutLive:(nonnull NSNumber *)workoutStartedAtMs
                  exerciseName:(NSString *)exerciseName
                  imageUrl:(NSString *)imageUrl
                  nextSetSummary:(NSString *)nextSetSummary
                  isResting:(BOOL)isResting
                  restEndAtMs:(NSNumber *)restEndAtMs
                  restSecondsDefault:(NSNumber *)restSecondsDefault
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(updateWorkoutLive:(nonnull NSNumber *)workoutStartedAtMs
                  exerciseName:(NSString *)exerciseName
                  imageUrl:(NSString *)imageUrl
                  nextSetSummary:(NSString *)nextSetSummary
                  isResting:(BOOL)isResting
                  restEndAtMs:(NSNumber *)restEndAtMs
                  restSecondsDefault:(NSNumber *)restSecondsDefault
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(endWorkoutLive:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(startRestTimer:(nonnull NSNumber *)endTimestampMs
                  exerciseName:(NSString *)exerciseName
                  imageUrl:(NSString *)imageUrl
                  nextSetSummary:(NSString *)nextSetSummary
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(updateRestTimer:(nonnull NSNumber *)endTimestampMs
                  exerciseName:(NSString *)exerciseName
                  imageUrl:(NSString *)imageUrl
                  nextSetSummary:(NSString *)nextSetSummary
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(endRestTimer:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(clearRestLive:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getCurrentWorkoutLiveState:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getCurrentRestTimerState:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end

@interface RCT_EXTERN_MODULE(RestTimerLiveActivityModule, RCTEventEmitter)

RCT_EXTERN_METHOD(pollPendingIntent:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(consumePendingCompleteSet:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(consumeAppTerminatedAt:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
