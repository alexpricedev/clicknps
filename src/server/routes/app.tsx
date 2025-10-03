import {
  about,
  dashboard,
  docs,
  examples,
  home,
  invites,
  pricing,
  profile,
  responsesController,
  settings,
  support,
  surveys,
  team,
} from "../controllers/app";
import { callback, login, logout, signup } from "../controllers/auth";
import { createRouteHandler } from "../utils/route-handler";

export const appRoutes = {
  "/": home.index,
  "/about": about.index,
  "/pricing": pricing.index,
  "/docs": docs.index,
  "/dashboard": dashboard.index,
  "/examples": createRouteHandler({
    GET: examples.index,
    POST: examples.create,
  }),
  "/examples/:id/delete": createRouteHandler({
    POST: examples.destroy,
  }),
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
    GET: settings.apiKeys,
    POST: settings.apiKeys,
  }),
  "/settings/webhooks": createRouteHandler({
    GET: settings.webhooks,
    POST: settings.webhooks,
  }),
  "/settings/profile": createRouteHandler({
    GET: profile.index,
    POST: profile.update,
  }),
  "/settings/team": createRouteHandler({
    GET: team.index,
    POST: team.index,
  }),
  "/settings/support": support.index,
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
  "/r/:token": responsesController.capture,
  "/r/:token/comment": createRouteHandler({
    POST: responsesController.addComment,
  }),
};
