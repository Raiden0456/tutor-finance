import { gql } from '@apollo/client/core';

export const Q_ME_SETTINGS = gql`
  query MySettings {
    mySettings {
      primaryCurrency
      theme
      locale
    }
  }
`;

export const Q_STUDENTS = gql`
  query Students($includeArchived: Boolean) {
    students(includeArchived: $includeArchived) {
      id
      name
      email
      phone
      hourlyRate {
        amount
        currency
      }
      defaultCurrency
      notes
      archivedAt
      createdAt
      updatedAt
    }
  }
`;

export const Q_LESSONS = gql`
  query Lessons($filter: LessonFilter) {
    lessons(filter: $filter) {
      id
      studentId
      startsAt
      durationMin
      status
      priceOverride {
        amount
        currency
      }
      notes
      createdAt
      updatedAt
    }
  }
`;

export const Q_TRANSACTIONS = gql`
  query Transactions($filter: TransactionFilter, $target: Currency!) {
    transactions(filter: $filter) {
      id
      type
      amount
      currency
      occurredAt
      category
      studentId
      lessonId
      description
      convertedAmount(target: $target)
    }
  }
`;

export const Q_DASHBOARD = gql`
  query Dashboard($from: DateTime!, $to: DateTime!, $target: Currency) {
    monthSummary(from: $from, to: $to, target: $target) {
      from
      to
      targetCurrency
      incomeInTargetCurrency
      expenseInTargetCurrency
      netInTargetCurrency
      income {
        currency
        amount
        count
      }
      expense {
        currency
        amount
        count
      }
    }
    lessons(filter: { limit: 5 }) {
      id
      startsAt
      durationMin
      status
      studentId
    }
  }
`;

export const M_CREATE_STUDENT = gql`
  mutation CreateStudent($input: StudentInput!) {
    createStudent(input: $input) {
      id
      name
    }
  }
`;

export const M_UPDATE_STUDENT = gql`
  mutation UpdateStudent($id: ID!, $patch: StudentPatch!) {
    updateStudent(id: $id, patch: $patch) {
      id
      name
    }
  }
`;

export const M_ARCHIVE_STUDENT = gql`
  mutation ArchiveStudent($id: ID!) {
    archiveStudent(id: $id) {
      id
      archivedAt
    }
  }
`;

export const M_CREATE_LESSON = gql`
  mutation CreateLesson($input: LessonInput!) {
    createLesson(input: $input) {
      id
      status
    }
  }
`;

export const M_UPDATE_LESSON = gql`
  mutation UpdateLesson($id: ID!, $patch: LessonPatch!) {
    updateLesson(id: $id, patch: $patch) {
      id
      status
    }
  }
`;

export const M_CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: TransactionInput!) {
    createTransaction(input: $input) {
      id
      type
      amount
      currency
    }
  }
`;

export const M_UPDATE_SETTINGS = gql`
  mutation UpdateMySettings($patch: UserSettingsPatch!) {
    updateMySettings(patch: $patch) {
      primaryCurrency
      theme
      locale
    }
  }
`;
