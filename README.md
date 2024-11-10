## Serverless REST Assignment - Distributed Systems.

__Name:__ Denis Miculescu (20098078)

__Demo:__ https://vimeo.com/1028227715/67af6e44de?share=copy

### Context.

The context I chose for my web API was NBA Teams and NBA players. For each team, the attributes stored were a unique id number, the team name, and a description from where the team is from. Each NBA player had a team id that links them to their team, the player's name, and position.

### App API endpoints.

[ Provide a bullet-point list of the app's endpoints (excluding the Auth API) you have successfully implemented. ]
e.g.
 
+ GET /teams - Get information of all NBA teams (currently there are only 4)
+ GET /teams/1 - Get information on team with id = 1
+ POST /teams - Add a new NBA Team to the database
+ DELETE /teams/1 - Delete NBA Team with id = 1
+ GET /teams/members?teamId=1&memberName=Jayson - Get information on an NBA player whos first name starts with Jayson (Jayson Tatum) and is on  team 1
+ GET /teams/members?teamId=1&memberPosition=Small - Get information on an NBA player whos position starts with Small (Small Forward) and is on  team 1

### Update constraint.

I have implemented a PUT constraint which appears in AWS API but I couldn't seem to get it fully working.

### Translation

I attempted to implement the translation feature but did not succeed.
