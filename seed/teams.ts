import {Team, TeamMember} from '../shared/types'

export const teams : Team[] = [
  {
    id: 1,
    teamName: "Boston Celtics",
    teamDescription: "Boston Celtics are an NBA team from Boston, Massachusetts"
  },
  {
    id: 2,
    teamName: "Los Angeles Lakers",
    teamDescription: "Los Angeles Lakers are an NBA team from Los Angeles, California"
  },
  {
    id: 3,
    teamName: "Golden State Warriors",
    teamDescription: "Golden State Warriors are an NBA team from San Fransisco, California"
  },
  {
    id: 4,
    teamName: "Dallas Mavericks",
    teamDescription: "Dallas Mavericks are an NBA team from Dallas, Texas"
  },
]

export const teamMembers : TeamMember[] = [
  {
    teamId: 1,
    memberName: "Jayson Tatum",
    memberPosition: "Small Forward",
    memberDescription: "Jayson Tatum is an NBA player who plays for Boston Celtics"
  },
  {
    teamId: 1,
    memberName: "Jaylen Brown",
    memberPosition: "Shooting Guard",
    memberDescription: "Jaylen Brown is an NBA player who plays for Boston Celtics"
  },
  {
    teamId: 2,
    memberName: "LeBron James",
    memberPosition: "Small Forward",
    memberDescription: "LeBron James is an NBA player who plays for Los Angeles Lakers"
  },
  {
    teamId: 2,
    memberName: "Anthony Davis",
    memberPosition: "Center",
    memberDescription: "Anthony Davis is an NBA player who plays for Los Angeles Lakers"
  },
  {
    teamId: 3,
    memberName: "Stephen Curry",
    memberPosition: "Point Guard",
    memberDescription: "Stephen Curry is an NBA player who plays for Golden State Warriors"
  },
  {
    teamId: 3,
    memberName: "Draymond Green",
    memberPosition: "Power Forward",
    memberDescription: "Draymond Green is an NBA player who plays for Golden State Warriors"
  },
  {
    teamId: 4,
    memberName: "Luka Doncic",
    memberPosition: "Point Guard",
    memberDescription: "Luka Doncic is an NBA player who plays for Dallas Mavericks"
  },
  {
    teamId: 4,
    memberName: "Kyrie Erving",
    memberPosition: "Shooting Guard",
    memberDescription: "Kyrie Erving is an NBA player who plays for Dallas Mavericks"
  },
]