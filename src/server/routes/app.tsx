import {
  about,
  apiKeys,
  docs,
  home,
  invites,
  pricing,
  profile,
  responses,
  support,
  surveys,
  team,
  webhooks,
} from "../controllers/app";
import { callback, login, logout, signup } from "../controllers/auth";
import { createRouteHandler } from "../utils/route-handler";

export const appRoutes = {
  "/": home.index,
  "/about": about.index,
  "/pricing": pricing.index,
  "/docs": docs.index,
  "/surveys": createRouteHandler({
    GET: surveys.index,
  }),
  "/surveys/new": createRouteHandler({
    GET: surveys.new,
    POST: surveys.create,
  }),
  "/surveys/:surveyId/mint": createRouteHandler({
    GET: surveys.mintForm,
    POST: surveys.mint,
  }),
  "/surveys/:surveyId/responses": createRouteHandler({
    GET: surveys.responses,
  }),
  "/settings/api-keys": createRouteHandler({
    GET: apiKeys.index,
    POST: apiKeys.index,
  }),
  "/settings/webhooks": createRouteHandler({
    GET: webhooks.index,
    POST: webhooks.index,
  }),
  "/settings/profile": createRouteHandler({
    GET: profile.index,
    POST: profile.update,
  }),
  "/settings/team": createRouteHandler({
    GET: team.index,
    POST: team.index,
  }),
  "/settings/support": createRouteHandler({
    GET: support.index,
    POST: support.submit,
  }),
  "/invites/accept": createRouteHandler({
    GET: invites.acceptForm,
    POST: invites.accept,
  }),
  "/login": createRouteHandler({
    GET: login.index,
    POST: login.create,
  }),
  "/signup": createRouteHandler({
    GET: signup.index,
    POST: signup.create,
  }),
  "/auth/callback": callback.index,
  "/auth/logout": createRouteHandler({
    POST: logout.create,
  }),
  "/r/:token": responses.capture,
  "/r/:token/comment": createRouteHandler({
    POST: responses.addComment,
  }),
};
