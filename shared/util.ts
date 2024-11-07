import { marshall } from "@aws-sdk/util-dynamodb";
import { Team } from "./types";

export const generateMovieItem = (movie: Team) => {
  return {
    PutRequest: {
      Item: marshall(movie),
    },
  };
};

export const generateBatch = (data: Team[]) => {
  return data.map((e) => {
    return generateMovieItem(e);
  });
};