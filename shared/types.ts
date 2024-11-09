export type Team =   {
    id: number,
    teamName: string,
    teamDescription: string
  }

export type TeamMember = {
    teamId: number;
    memberName: string;
    memberPosition: string;
    memberDescription: string;
 };

export type TeamMemberQueryParams = {
    teamId: string;
    memberName?: string;
    memberPosition?: string
}

export type SignUpBody = {
  username: string;
  password: string;
  email: string
}

export type ConfirmSignUpBody = {
  username: string;
  code: string;
}

export type SignInBody = {
  username: string;
  password: string;
}