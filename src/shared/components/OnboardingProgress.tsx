import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OnboardingStep {
  number: number;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface OnboardingProgressProps {
  currentStep: number;
  businessInfoCompleted: boolean;
  stripeVerificationCompleted: boolean;
  onCompleteStripe?: () => void;
  onCheckStatus?: () => void;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  businessInfoCompleted,
  stripeVerificationCompleted,
  onCompleteStripe,
  onCheckStatus,
}) => {
  const steps: OnboardingStep[] = [
    {
      number: 1,
      title: 'Business Information',
      description: 'Complete your service provider profile',
      completed: businessInfoCompleted,
      current: currentStep === 1,
    },
    {
      number: 2,
      title: 'Stripe Verification',
      description: 'Verify your identity to accept payments',
      completed: stripeVerificationCompleted,
      current: currentStep === 2 && !stripeVerificationCompleted,
      action: onCompleteStripe,
      actionLabel: 'Complete Verification',
    },
    {
      number: 3,
      title: 'Ready to Go!',
      description: 'Start listing your services',
      completed: stripeVerificationCompleted && businessInfoCompleted,
      current: currentStep === 3 && !(stripeVerificationCompleted && businessInfoCompleted),
    },
  ];

  const getStepIcon = (step: OnboardingStep) => {
    if (step.completed) {
      return <Ionicons name="checkmark-circle" size={24} color="#34C759" />;
    }
    if (step.current) {
      return (
        <View style={styles.currentStepIcon}>
          <Text style={styles.currentStepNumber}>{step.number}</Text>
        </View>
      );
    }
    return (
      <View style={styles.pendingStepIcon}>
        <Text style={styles.pendingStepNumber}>{step.number}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Setup Progress</Text>
        <Text style={styles.headerSubtitle}>
          Complete all steps to start accepting payments
        </Text>
      </View>

      {steps.map((step, index) => (
        <View key={step.number}>
          <View style={styles.stepContainer}>
            <View style={styles.stepIconContainer}>
              {getStepIcon(step)}
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    step.completed && styles.connectorCompleted,
                  ]}
                />
              )}
            </View>

            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text
                  style={[
                    styles.stepTitle,
                    step.completed && styles.stepTitleCompleted,
                    step.current && styles.stepTitleCurrent,
                  ]}
                >
                  {step.title}
                </Text>
                {step.completed && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>Completed</Text>
                  </View>
                )}
                {step.current && !step.completed && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>In Progress</Text>
                  </View>
                )}
              </View>

              <Text style={styles.stepDescription}>{step.description}</Text>

              {step.action && step.current && !step.completed && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={step.action}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>
                    {step.actionLabel}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ))}

      {!stripeVerificationCompleted && (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={18} color="#FFB340" />
          <Text style={styles.warningText}>
            You cannot list services until Stripe verification is complete
          </Text>
          {onCheckStatus && (
            <TouchableOpacity
              style={styles.checkStatusButton}
              onPress={onCheckStatus}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color="#FFB340" />
              <Text style={styles.checkStatusText}>Check Status</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {stripeVerificationCompleted && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={18} color="#34C759" />
          <Text style={styles.successText}>
            🎉 You're all set! You can now list services and accept payments.
          </Text>
        </View>
      )}
    </View>
  );
};

// Apple-inspired onboarding stepper with clean, minimal design
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#15151C',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    fontWeight: '400',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  currentStepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  currentStepNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingStepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingStepNumber: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  connector: {
    width: 1.5,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
    marginBottom: 4,
  },
  connectorCompleted: {
    backgroundColor: '#34C759',
  },
  stepContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
    letterSpacing: -0.4,
  },
  stepTitleCompleted: {
    color: '#FFFFFF',
  },
  stepTitleCurrent: {
    color: '#007AFF',
  },
  completedBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  completedBadgeText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  currentBadgeText: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 8,
    fontWeight: '400',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    gap: 5,
    minHeight: 38,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 179, 64, 0.12)',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FFB340',
    fontWeight: '500',
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500',
    lineHeight: 18,
  },
  checkStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 179, 64, 0.2)',
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  checkStatusText: {
    color: '#FFB340',
    fontSize: 13,
    fontWeight: '600',
  },
});

