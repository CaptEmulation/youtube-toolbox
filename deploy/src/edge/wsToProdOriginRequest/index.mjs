/** @type import("aws-lambda").CloudFrontRequestHandler */
export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  let uri = request.uri;

  // If path is /ws, then change the path to /Prod
  if (uri === "/ws") {
    uri = "/Prod";
  }

  // Update the uri
  request.uri = uri;
  return request;
};
