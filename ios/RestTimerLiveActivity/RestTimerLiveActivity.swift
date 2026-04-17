import ActivityKit
import WidgetKit
import SwiftUI
import UIKit
import AppIntents
import RestTimerShared

// MARK: - Design tokens (morado EvoFit)

private extension Color {
    static let evoAccent    = Color(red: 0.56, green: 0.35, blue: 1.0)   // #8F59FF – morado principal
    static let evoDimmed    = Color(red: 0.42, green: 0.22, blue: 0.82)  // #6B38D1 – morado más oscuro (hover/progress)
    static let evoBg        = Color(red: 0.11, green: 0.11, blue: 0.12)  // #1C1C1E
    static let evoSurface   = Color(red: 0.17, green: 0.17, blue: 0.18)  // #2C2C2E
    static let evoLabel     = Color(white: 0.922)                         // #EBEBF5
    static let evoRed       = Color(red: 1.0,  green: 0.27, blue: 0.23)  // #FF453A
}

// MARK: - Subviews reutilizables

private struct ExerciseThumbnail: View {
    let image: UIImage?
    let size: CGFloat

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                ZStack {
                    Color.evoSurface
                    Image(systemName: "dumbbell.fill")
                        .font(.system(size: size * 0.38, weight: .semibold))
                        .foregroundStyle(Color.evoAccent)
                }
            }
        }
        .frame(width: size, height: size)
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: size * 0.25, style: .continuous))
    }
}

private struct EvoProgressBar: View {
    let interval: ClosedRange<Date>

    var body: some View {
        ProgressView(timerInterval: interval, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
            .progressViewStyle(.linear)
            .tint(Color.evoAccent)
            .scaleEffect(x: 1, y: 0.5, anchor: .center)
    }
}

private struct RemainingTimeText: View {
    let endDate: Date
    let fontSize: CGFloat

    var body: some View {
        Text(endDate, style: .timer)
            .font(.system(size: fontSize, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(Color.evoAccent)
            .multilineTextAlignment(.trailing)
    }
}

@available(iOSApplicationExtension 17.0, *)
private struct EvoActionButtons: View {
    var body: some View {
        HStack(spacing: 6) {
            Button(intent: SubtractRestTimeIntent()) {
                Text("−15s")
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(EvoSecondaryButtonStyle())

            Button(intent: AddRestTimeIntent()) {
                Text("+15s")
                    .font(.system(size: 13, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(EvoPrimaryButtonStyle())

            Button(intent: SkipRestTimeIntent()) {
                Text("Omitir")
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(EvoDestructiveButtonStyle())
        }
    }
}

// MARK: - Button styles

private struct EvoPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.vertical, 8)
            .background(Color.evoAccent)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}

private struct EvoSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.vertical, 8)
            .background(Color.evoSurface)
            .foregroundStyle(Color.evoLabel.opacity(0.85))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}

private struct EvoDestructiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.vertical, 8)
            .background(Color.evoRed.opacity(0.18))
            .foregroundStyle(Color.evoRed)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}

// MARK: - Lock screen expanded view

struct RestTimerLiveActivityView: View {
    let context: ActivityViewContext<RestTimerAttributes>

    private var interval: ClosedRange<Date> {
        context.attributes.startDate...context.state.endDate
    }

    private var exerciseName: String {
        context.state.exerciseName?.nilIfEmpty ?? "Descanso en curso"
    }

    private var nextSetSummary: String {
        context.state.nextSetSummary?.nilIfEmpty ?? "Siguiente serie pendiente"
    }

    // ── Carga la imagen desde el App Group (igual que antes, pero expuesto como computed var)
    private var sharedImage: UIImage? {
        guard
            let fileName = context.state.exerciseImageFileName,
            let containerURL = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: RestTimerLiveActivityShared.appGroupIdentifier
            )
        else { return nil }
        return UIImage(contentsOfFile: containerURL.appendingPathComponent(fileName).path)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 14) {
                ExerciseThumbnail(image: sharedImage, size: 54)

                VStack(alignment: .leading, spacing: 6) {
                    Text(exerciseName)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color.evoLabel)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    Text(nextSetSummary)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.evoLabel.opacity(0.66))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }

                Spacer(minLength: 8)

                VStack(alignment: .trailing, spacing: 4) {
                    RemainingTimeText(endDate: context.state.endDate, fontSize: 30)

                    Text("restantes")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.evoLabel.opacity(0.55))
                }
            }

            EvoProgressBar(interval: interval)

            if #available(iOSApplicationExtension 17.0, *) {
                EvoActionButtons()
            }
        }
        .padding(.top, 16)
        .padding(.horizontal, 16)
        .padding(.bottom, 14)
        .activityBackgroundTint(Color.evoBg)
        .activitySystemActionForegroundColor(Color.evoLabel)
    }
}

// MARK: - Dynamic Island

struct RestTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestTimerAttributes.self) { context in
            RestTimerLiveActivityView(context: context)

        } dynamicIsland: { context in
            let interval  = context.attributes.startDate...context.state.endDate
            let name      = context.state.exerciseName?.nilIfEmpty ?? "Descanso"
            let nextSet   = context.state.nextSetSummary?.nilIfEmpty ?? "Siguiente serie pendiente"

            // Imagen para la Dynamic Island (misma lógica App Group)
            let islandImage: UIImage? = {
                guard
                    let fileName = context.state.exerciseImageFileName,
                    let containerURL = FileManager.default.containerURL(
                        forSecurityApplicationGroupIdentifier: RestTimerLiveActivityShared.appGroupIdentifier
                    )
                else { return nil }
                return UIImage(contentsOfFile: containerURL.appendingPathComponent(fileName).path)
            }()

            return DynamicIsland {

                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        ExerciseThumbnail(image: islandImage, size: 34)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(name)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Color.evoLabel)
                                .lineLimit(1)

                            Text(nextSet)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(Color.evoLabel.opacity(0.62))
                                .lineLimit(1)
                        }
                    }
                    .padding(.leading, 10)
                    .padding(.top, 10)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        RemainingTimeText(endDate: context.state.endDate, fontSize: 16)
                    }
                    .padding(.trailing, 10)
                    .padding(.top, 10)
                }

                DynamicIslandExpandedRegion(.center) {
                    EvoProgressBar(interval: interval)
                        .padding(.horizontal, 10)
                        .padding(.top, 12)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    if #available(iOSApplicationExtension 17.0, *) {
                        EvoActionButtons()
                            .padding(.horizontal, 12)
                            .padding(.top, 8)
                            .padding(.bottom, 12)
                    }
                }

            } compactLeading: {
                ExerciseThumbnail(image: islandImage, size: 18)
                    .padding(.leading, 6)

            } compactTrailing: {
                RemainingTimeText(endDate: context.state.endDate, fontSize: 12)
                    .padding(.trailing, 6)

            } minimal: {
                ExerciseThumbnail(image: islandImage, size: 24)
            }
        }
    }
}

// MARK: - Bundle

@main
struct RestTimerLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        RestTimerLiveActivity()
    }
}

// MARK: - Helpers

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
