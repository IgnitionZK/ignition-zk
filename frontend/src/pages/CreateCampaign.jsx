import React, { useState, useMemo } from "react";
import styled from "styled-components";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// custom hooks
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import { useGetEpochsByGroupId } from "../hooks/queries/epochs/useGetEpochsByGroupId";
import CustomButton from "../components/CustomButton";
import CustomDropdown from "../components/CustomDropdown";
import PageHeader from "../components/PageHeader";

// icons
import { IoIosInformationCircle } from "react-icons/io";

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
  flex: 1;
  min-height: 100vh;
  min-width: 55rem;
  color: var(--color-grey-100);
  padding: 0 2rem;
  box-sizing: border-box;
`;

const FormSection = styled.section`
  background: rgba(165, 180, 252, 0.05);
  border-radius: 1.2rem;
  padding: 2.4rem 2rem 2rem 2rem;
  margin-bottom: 2.4rem;
  border: 1px solid rgba(165, 180, 252, 0.08);
`;

const SectionTitle = styled.h2`
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--color-grey-100);
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const InfoIcon = styled(IoIosInformationCircle)`
  color: #a5b4fc;
  font-size: 1.7rem;
  vertical-align: middle;
`;

const Label = styled.label`
  font-size: 1.3rem;
  color: var(--color-grey-200);
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const FormField = styled.div`
  margin-bottom: 1.6rem;
`;

const StyledDatePicker = styled(DatePicker)`
  background: #232328;
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 0.8rem;
  color: #fff;
  padding: 0.9rem 1.2rem;
  font-size: 1.3rem;
  width: 100%;
  transition: all 0.2s ease-in-out;

  &::placeholder {
    color: var(--color-grey-400);
  }
  &:focus {
    outline: none;
    border-color: #a5b4fc;
    background: rgba(165, 180, 252, 0.08);
  }
`;

const Input = styled.input`
  background: #232328;
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 0.8rem;
  color: #fff;
  padding: 0.9rem 1.2rem;
  font-size: 1.3rem;
  width: 100%;
  transition: all 0.2s ease-in-out;

  &::placeholder {
    color: var(--color-grey-400);
  }
  &:focus {
    outline: none;
    border-color: #a5b4fc;
    background: rgba(165, 180, 252, 0.08);
  }
`;

const InstructionsText = styled.p`
  color: var(--color-grey-200);
  font-size: 1.15rem;
  margin-bottom: 1.2rem;
  line-height: 1.6;
`;

const InstructionsList = styled.ol`
  list-style: decimal;
  padding-left: 2rem;
  color: var(--color-grey-200);
  font-size: 1.15rem;
  line-height: 1.6;
  margin-bottom: 1.2rem;
`;

const InstructionItem = styled.li`
  margin-bottom: 0.8rem;

  &.warning {
    color: var(--color-red-400);
    font-weight: 500;
  }
`;

const InfoIconWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  &:hover > div {
    opacity: 1;
    visibility: visible;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  top: -3.2rem;
  left: 0;
  min-width: 260px;
  max-width: 340px;
  background: var(--color-grey-800);
  color: var(--color-grey-100);
  padding: 1rem 1.4rem;
  border-radius: 0.6rem;
  font-size: 1.32rem;
  white-space: normal;
  word-break: break-word;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease-in-out;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1.6rem;
  justify-content: center;
  margin-top: 2.4rem;
`;

const ErrorMessage = styled.div`
  color: var(--color-red-400);
  font-size: 1.2rem;
  margin-top: 0.4rem;
  font-weight: 500;
`;

export default function CreateCampaign({ onCancel }) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [eventName, setEventName] = useState("");
  const [duration, setDuration] = useState("");
  const [startDate, setStartDate] = useState(null);

  // Validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Get user groups
  const {
    userGroups,
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useGetUserGroups();

  // Get the selected group object to access group_id
  const selectedGroupObject = useMemo(() => {
    if (!userGroups || !selectedGroup) return null;
    return userGroups.find((group) => group.name === selectedGroup);
  }, [userGroups, selectedGroup]);

  // Get existing epochs for the selected group
  const {
    epochs: existingEpochs,
    isLoading: isLoadingEpochs,
    error: epochsError,
  } = useGetEpochsByGroupId(selectedGroupObject?.group_id);

  // Duration options
  const durationOptions = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => `${i + 2} weeks`);
  }, []);

  // Group options for dropdown
  const groupOptions = useMemo(() => {
    if (!userGroups) return [];
    return userGroups.map((group) => group.name);
  }, [userGroups]);

  // Calculate end date based on start date and duration
  const endDate = useMemo(() => {
    if (!startDate) return null;
    const weeks = parseInt(duration.split(" ")[0]);
    const end = new Date(startDate);
    // For 2 weeks, we want 14 days total (including start date)
    // So we add (weeks * 7) - 1 to get the correct end date
    end.setDate(end.getDate() + weeks * 7 - 1);
    return end;
  }, [startDate, duration]);

  // Function to check if a date is within the campaign period
  const isInCampaignPeriod = (date) => {
    if (!startDate || !endDate) return false;
    // Reset time to start of day for accurate comparison
    const checkDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const start = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const end = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );
    return checkDate >= start && checkDate <= end;
  };

  // Function to check if a date conflicts with existing epochs
  const isDateConflicting = (date) => {
    if (!existingEpochs || !date) return false;

    const checkDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    return existingEpochs.some((epoch) => {
      const epochStart = new Date(epoch.epoch_start_time);
      const epochEnd = new Date(epochStart);
      epochEnd.setDate(epochEnd.getDate() + epoch.epoch_duration - 1);

      // Reset times for accurate comparison
      const normalizedEpochStart = new Date(
        epochStart.getFullYear(),
        epochStart.getMonth(),
        epochStart.getDate()
      );
      const normalizedEpochEnd = new Date(
        epochEnd.getFullYear(),
        epochEnd.getMonth(),
        epochEnd.getDate()
      );

      return (
        checkDate >= normalizedEpochStart && checkDate <= normalizedEpochEnd
      );
    });
  };

  // Function to check if a date range conflicts with existing epochs
  const isDateRangeConflicting = (start, end) => {
    if (!existingEpochs || !start || !end) return false;

    const normalizedStart = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );
    const normalizedEnd = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );

    return existingEpochs.some((epoch) => {
      const epochStart = new Date(epoch.epoch_start_time);
      const epochEnd = new Date(epochStart);
      epochEnd.setDate(epochEnd.getDate() + epoch.epoch_duration - 1);

      // Reset times for accurate comparison
      const normalizedEpochStart = new Date(
        epochStart.getFullYear(),
        epochStart.getMonth(),
        epochStart.getDate()
      );
      const normalizedEpochEnd = new Date(
        epochEnd.getFullYear(),
        epochEnd.getMonth(),
        epochEnd.getDate()
      );

      // Check for overlap: new campaign starts before existing ends AND new campaign ends after existing starts
      return (
        normalizedStart <= normalizedEpochEnd &&
        normalizedEnd >= normalizedEpochStart
      );
    });
  };

  // Custom day class name for highlighting
  const getDayClassName = (date) => {
    if (isInCampaignPeriod(date)) {
      return "campaign-period-day";
    }
    return "";
  };

  // Function to filter dates that should be disabled
  const filterDate = (date) => {
    // Disable past dates
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      return false;
    }

    // Disable dates that conflict with existing epochs
    if (isDateConflicting(date)) {
      return false;
    }

    return true;
  };

  // Validation functions
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case "selectedGroup":
        return !value ? "Please select a group" : "";
      case "eventName":
        return !value || value.trim() === "" ? "Event name is required" : "";
      case "duration":
        return !value ? "Please select a duration" : "";
      case "startDate":
        if (!value) return "Please select a start date";
        if (isDateRangeConflicting(value, endDate)) {
          return "This date range conflicts with an existing campaign";
        }
        return "";
      default:
        return "";
    }
  };

  const handleFieldChange = (fieldName, value) => {
    // Update the field value
    switch (fieldName) {
      case "selectedGroup":
        setSelectedGroup(value);
        break;
      case "eventName":
        setEventName(value);
        break;
      case "duration":
        setDuration(value);
        break;
      case "startDate":
        setStartDate(value);
        break;
    }

    // Mark field as touched
    setTouched((prev) => ({ ...prev, [fieldName]: true }));

    // Validate the field
    const error = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const validateAllFields = () => {
    const newErrors = {};
    newErrors.selectedGroup = validateField("selectedGroup", selectedGroup);
    newErrors.eventName = validateField("eventName", eventName);
    newErrors.duration = validateField("duration", duration);
    newErrors.startDate = validateField("startDate", startDate);

    setErrors(newErrors);
    setTouched({
      selectedGroup: true,
      eventName: true,
      duration: true,
      startDate: true,
    });

    return !Object.values(newErrors).some((error) => error);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all fields
    if (!validateAllFields()) {
      return;
    }

    // TODO: Implement campaign creation logic
    console.log("Creating campaign:", {
      selectedGroup,
      eventName,
      duration,
      startDate,
      endDate,
      groupId: selectedGroupObject?.group_id,
    });
  };

  if (isLoadingGroups) {
    return <div>Loading groups...</div>;
  }

  if (groupsError) {
    return <div>Error loading groups: {groupsError.message}</div>;
  }

  return (
    <>
      <style>
        {`
          .campaign-datepicker-popper {
            z-index: 9999 !important;
          }
          .campaign-datepicker-popper .react-datepicker {
            background: #3a4353 !important;
            border: 1px solid #4a5568 !important;
            border-radius: 8px !important;
            color: var(--color-grey-100) !important;
          }
          .campaign-datepicker-popper .react-datepicker__header {
            background: #232328 !important;
            border-bottom: 1px solid #4a5568 !important;
            color: var(--color-grey-100) !important;
          }
          .campaign-datepicker-popper .react-datepicker__current-month,
          .campaign-datepicker-popper .react-datepicker__day-name {
            color: var(--color-grey-100) !important;
          }
          .campaign-datepicker-popper .react-datepicker__day {
            color: var(--color-grey-100) !important;
            background: transparent !important;
          }
          .campaign-datepicker-popper .react-datepicker__day:hover {
            background: #444b5e !important;
          }
          .campaign-datepicker-popper .react-datepicker__day--selected {
            background: #a5b4fc !important;
            color: #232328 !important;
          }
          .campaign-datepicker-popper .react-datepicker__day--keyboard-selected {
            background: #a5b4fc !important;
            color: #232328 !important;
          }
          .campaign-datepicker-popper .campaign-period-day {
            background: rgba(165, 180, 252, 0.2) !important;
            color: var(--color-grey-100) !important;
          }
          .campaign-datepicker-popper .campaign-period-day:hover {
            background: rgba(165, 180, 252, 0.3) !important;
          }
          .campaign-datepicker-popper .react-datepicker__day--disabled {
            color: var(--color-grey-600) !important;
            background: rgba(239, 68, 68, 0.1) !important;
          }
          .campaign-datepicker-popper .react-datepicker__day--disabled:hover {
            background: rgba(239, 68, 68, 0.2) !important;
          }
        `}
      </style>
      <PageContainer>
        <PageHeader title="New Campaign" />

        <FormSection>
          <SectionTitle>Instructions</SectionTitle>
          <InstructionsText>
            Please read the following instructions carefully before creating
            your event:
          </InstructionsText>
          <InstructionsList>
            <InstructionItem>All fields required.</InstructionItem>
            <InstructionItem>
              New campaigns CANNOT overlap with current campaigns within the
              same group.
            </InstructionItem>
            <InstructionItem>
              Campaigns will automatically be divided into 3 distinct phases –
              proposal phase, voting phase, and a review phase.
              <InfoIconWrapper>
                <InfoIcon />
                <Tooltip>
                  Campaigns are automatically divided into three phases:
                  proposal, voting, and review. Each phase has specific time
                  allocations and purposes.
                </Tooltip>
              </InfoIconWrapper>
            </InstructionItem>
            <InstructionItem className="warning">
              Once submitted, the event details cannot be altered.
            </InstructionItem>
          </InstructionsList>
        </FormSection>

        <FormSection>
          <FormField>
            <Label>
              Select Group
              <InfoIconWrapper>
                <InfoIcon />
                <Tooltip>
                  Choose the group for which you want to create this event. You
                  can only create campaigns for groups you are a member of.
                </Tooltip>
              </InfoIconWrapper>
            </Label>
            <CustomDropdown
              options={groupOptions}
              selectedOption={selectedGroup}
              onSelect={(value) => handleFieldChange("selectedGroup", value)}
              placeholder="-"
              fullWidth={true}
            />
            {isLoadingEpochs && selectedGroup && (
              <div
                style={{
                  color: "var(--color-grey-400)",
                  fontSize: "1.2rem",
                  marginTop: "0.4rem",
                }}
              >
                Loading existing campaigns...
              </div>
            )}
            {epochsError && (
              <div
                style={{
                  color: "var(--color-red-400)",
                  fontSize: "1.2rem",
                  marginTop: "0.4rem",
                }}
              >
                Error loading existing campaigns: {epochsError.message}
              </div>
            )}
            {touched.selectedGroup && errors.selectedGroup && (
              <ErrorMessage>{errors.selectedGroup}</ErrorMessage>
            )}
          </FormField>

          <FormField>
            <Label>
              Event Name
              <InfoIconWrapper>
                <InfoIcon />
                <Tooltip>
                  Enter a descriptive name for your event. This will be
                  displayed to all group members and cannot be changed after
                  creation.
                </Tooltip>
              </InfoIconWrapper>
            </Label>
            <Input
              type="text"
              value={eventName}
              onChange={(e) => handleFieldChange("eventName", e.target.value)}
              placeholder="Enter event name"
              required
            />
            {touched.eventName && errors.eventName && (
              <ErrorMessage>{errors.eventName}</ErrorMessage>
            )}
          </FormField>

          <FormField>
            <Label>
              Duration
              <InfoIconWrapper>
                <InfoIcon />
                <Tooltip>
                  Select the total duration for your event. This will be divided
                  into the three phases: proposal, voting, and review.
                </Tooltip>
              </InfoIconWrapper>
            </Label>
            <CustomDropdown
              options={durationOptions}
              selectedOption={duration}
              onSelect={(value) => handleFieldChange("duration", value)}
              placeholder="-"
              fullWidth={true}
            />
            {touched.duration && errors.duration && (
              <ErrorMessage>{errors.duration}</ErrorMessage>
            )}
          </FormField>

          <FormField>
            <Label>
              Choose a Start Date
              <InfoIconWrapper>
                <InfoIcon />
                <Tooltip>
                  Select the start date for your campaign. The calendar will
                  highlight the campaign period based on your selected duration.
                </Tooltip>
              </InfoIconWrapper>
            </Label>
            <StyledDatePicker
              selected={startDate}
              onChange={(date) => handleFieldChange("startDate", date)}
              placeholderText="Select start date"
              dateFormat="MMM dd, yyyy"
              filterDate={filterDate}
              dayClassName={getDayClassName}
              showPopperArrow={false}
              popperClassName="campaign-datepicker-popper"
            />
            {touched.startDate && errors.startDate && (
              <ErrorMessage>{errors.startDate}</ErrorMessage>
            )}
          </FormField>
        </FormSection>

        <ButtonRow>
          <CustomButton
            backgroundColor="#a5b4fc"
            textColor="#232328"
            hoverColor="#818cf8"
            onClick={handleSubmit}
          >
            Create
          </CustomButton>
          <CustomButton
            backgroundColor="var(--color-red-300)"
            textColor="#232328"
            hoverColor="var(--color-red-400)"
            onClick={onCancel}
          >
            Cancel
          </CustomButton>
        </ButtonRow>
      </PageContainer>
    </>
  );
}
