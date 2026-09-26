export type FormState =
  | {
      ok?: boolean;
      message?: string;
      /** A one-time link to show the admin when the email couldn't be sent. */
      link?: string;
      errors?: Record<string, string>;
      fields?: Record<string, string>;
    }
  | undefined;
