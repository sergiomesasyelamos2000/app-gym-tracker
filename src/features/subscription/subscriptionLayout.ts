import { ViewStyle } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";

export const SUBSCRIPTION_CONTENT_MAX_WIDTH = 520;
export const SUBSCRIPTION_GUTTER = 24;
export const SUBSCRIPTION_CARD_GAP = 12;
export const SUBSCRIPTION_SECTION_GAP = 16;
export const SUBSCRIPTION_BADGE_CLEARANCE = 16;

export function subscriptionColumnStyle(): ViewStyle {
  return {
    width: "100%",
    maxWidth: SUBSCRIPTION_CONTENT_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: SUBSCRIPTION_GUTTER,
  };
}

export type SubscriptionTypeScale = {
  hero: number;
  title: number;
  price: number;
  currency: number;
  section: number;
  body: number;
  feature: number;
  caption: number;
  button: number;
  bodyLineHeight: number;
};

export function subscriptionTypeScale(
  isSmallPhone: boolean
): SubscriptionTypeScale {
  const body = RFValue(isSmallPhone ? 15 : 16);

  return {
    hero: RFValue(isSmallPhone ? 22 : 26),
    title: RFValue(isSmallPhone ? 20 : 22),
    price: RFValue(isSmallPhone ? 32 : 40),
    currency: RFValue(isSmallPhone ? 18 : 22),
    section: RFValue(isSmallPhone ? 16 : 18),
    body,
    feature: RFValue(isSmallPhone ? 13 : 14),
    caption: RFValue(isSmallPhone ? 11 : 12),
    button: RFValue(isSmallPhone ? 15 : 16),
    bodyLineHeight: Math.round(body * 1.45),
  };
}
