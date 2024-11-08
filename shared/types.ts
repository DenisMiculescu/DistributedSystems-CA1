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