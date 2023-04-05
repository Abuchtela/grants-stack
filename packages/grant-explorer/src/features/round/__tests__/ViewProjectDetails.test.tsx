import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();

import {
  makeApprovedProjectData,
  makeRoundData,
  mockBalance,
  mockNetwork,
  mockSigner,
  renderWithContext,
} from "../../../test-utils";
import { fireEvent, screen } from "@testing-library/react";
import ViewProjectDetails from "../ViewProjectDetails";
import { faker } from "@faker-js/faker";
import { SWRConfig } from "swr";
import { rest } from "msw";
import { setupServer } from "msw/node";

const chainId = faker.datatype.number();
const roundId = faker.finance.ethereumAddress();
const grantApplicationId = "0xdeadbeef-0xdeadbeef";
const useParamsFn = () => ({
  chainId,
  roundId,
  applicationId: grantApplicationId,
});
const userAddress = faker.finance.ethereumAddress();
const mockAccount = {
  address: userAddress,
};

jest.mock("../../common/Navbar");
jest.mock("../../common/Auth");
jest.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: jest.fn(),
}));

jest.mock("wagmi", () => ({
  useAccount: () => mockAccount,
  useBalance: () => mockBalance,
  useSigner: () => mockSigner,
  useNetwork: () => mockNetwork,
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: useParamsFn,
}));

const server = setupServer(
  rest.get(
    `https://grants-stack-indexer.fly.dev/data/:chainId/rounds/:roundId/projects.json`,
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json([
          {
            id: "0xdeadbeef",
            amountUSD: 12345,
            uniqueContributors: 42,
          },
        ])
      );
    }
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("<ViewProjectDetails/>", () => {
  it("shows project name", async () => {
    const expectedProject = makeApprovedProjectData({ grantApplicationId });
    const expectedProjectName = expectedProject.projectMetadata.title;

    const roundWithProjects = makeRoundData({
      id: roundId,
      approvedProjects: [expectedProject],
    });
    renderWithContext(<ViewProjectDetails />, { rounds: [roundWithProjects] });

    expect(await screen.findByText(expectedProjectName)).toBeInTheDocument();
  });

  describe("Show project details", () => {
    const expectedProject = makeApprovedProjectData({ grantApplicationId });
    const expectedProjectWebsite = expectedProject.projectMetadata.website;

    const roundWithProjects = makeRoundData({
      id: roundId,
      approvedProjects: [expectedProject],
    });

    beforeEach(() => {
      jest.clearAllMocks();
      renderWithContext(<ViewProjectDetails />, {
        rounds: [roundWithProjects],
      });
    });

    it("shows project recipient", async () => {
      expect(await screen.getByTestId("project-recipient")).toBeInTheDocument();
    });

    it("shows project website", async () => {
      expect(
        await screen.findByText(expectedProjectWebsite)
      ).toBeInTheDocument();
    });

    it("shows project twitter", async () => {
      expect(screen.getByTestId("project-twitter")).toBeInTheDocument();
    });

    it("shows created at date", async () => {
      expect(screen.getByTestId("project-createdAt")).toBeInTheDocument();
    });

    it("shows project user github", async () => {
      expect(screen.getByTestId("user-github")).toBeInTheDocument();
    });

    it("shows project github", async () => {
      expect(screen.getByTestId("project-github")).toBeInTheDocument();
    });
  });

  it("shows project stats", async () => {
    const expectedProject = makeApprovedProjectData({ grantApplicationId });
    const roundWithProjects = makeRoundData({
      id: roundId,
      approvedProjects: [expectedProject],
    });
    renderWithContext(
      <SWRConfig value={{ dedupingInterval: 0 }}>
        <ViewProjectDetails />
      </SWRConfig>,
      { rounds: [roundWithProjects] }
    );
    /* Initially shows - when loading */
    expect(screen.getByText("$-")).toBeInTheDocument();
  });

  it("shows project description", async () => {
    const expectedProject = makeApprovedProjectData({ grantApplicationId });
    const expectedProjectDescription =
      expectedProject.projectMetadata.description;

    const roundWithProjects = makeRoundData({
      id: roundId,
      approvedProjects: [expectedProject],
    });
    renderWithContext(<ViewProjectDetails />, { rounds: [roundWithProjects] });

    expect(
      await screen.findByText(expectedProjectDescription)
    ).toBeInTheDocument();
  });

  it("shows project banner", async () => {
    const expectedProjectBannerImg = "bannersrc";
    const expectedProject = makeApprovedProjectData(
      { grantApplicationId },
      { bannerImg: expectedProjectBannerImg }
    );

    const roundWithProjects = makeRoundData({
      id: roundId,
      approvedProjects: [expectedProject],
    });
    renderWithContext(<ViewProjectDetails />, { rounds: [roundWithProjects] });

    const bannerImg = screen.getByRole("img", {
      name: /project banner/i,
    }) as HTMLImageElement;

    expect(bannerImg.src).toContain(expectedProjectBannerImg);
  });

  it("shows project logo", async () => {
    const expectedProjectLogoImg = "logosrc";
    const expectedProject = makeApprovedProjectData(
      { grantApplicationId },
      { logoImg: expectedProjectLogoImg }
    );

    const roundWithProjects = makeRoundData({
      id: roundId,
      approvedProjects: [expectedProject],
    });
    renderWithContext(<ViewProjectDetails />, { rounds: [roundWithProjects] });

    const logoImg = screen.getByRole("img", {
      name: /project logo/i,
    }) as HTMLImageElement;

    expect(logoImg.src).toContain(expectedProjectLogoImg);
  });

  it("shows project application form answers", async () => {
    const expectedProject = makeApprovedProjectData({
      grantApplicationId,
      grantApplicationFormAnswers: [
        {
          questionId: 0,
          question: "What is love?",
          answer: "baby don't hurt me",
          hidden: false,
        },
        {
          questionId: 1,
          question: "this is a hidden question",
          answer: "this will not show up",
          hidden: true,
        },
        {
          questionId: 2,
          question: "array of strings",
          answer: ["first option", "second option"],
          hidden: false,
        },
      ],
    });

    const roundWithProjects = makeRoundData({
      id: roundId,
      approvedProjects: [expectedProject],
    });

    renderWithContext(<ViewProjectDetails />, { rounds: [roundWithProjects] });

    expect(screen.getByText("Additional Information")).toBeInTheDocument();

    expect(screen.getByText("What is love?")).toBeInTheDocument();
    expect(screen.getByText("baby don't hurt me")).toBeInTheDocument();

    expect(
      screen.queryByText("this is a hidden question")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("this will not show up")).not.toBeInTheDocument();

    expect(screen.getByText("array of strings")).toBeInTheDocument();
    expect(screen.getByText("first option, second option")).toBeInTheDocument();
  });

  it("hides project application form answers when they're empty", async () => {
    const expectedProject = makeApprovedProjectData({
      grantApplicationId,
      grantApplicationFormAnswers: [
        {
          questionId: 1,
          question: "this is a hidden question",
          answer: "this will not show up",
          hidden: true,
        },
      ],
    });

    const roundWithProjects = makeRoundData({
      id: roundId,
      approvedProjects: [expectedProject],
    });

    renderWithContext(<ViewProjectDetails />, { rounds: [roundWithProjects] });

    expect(
      screen.queryByText("Additional Information")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("this is a hidden question")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("this will not show up")).not.toBeInTheDocument();
  });
});

describe("voting cart", () => {
  const expectedProject = makeApprovedProjectData({ grantApplicationId });
  const roundWithProjects = makeRoundData({
    id: roundId,
    approvedProjects: [expectedProject],
  });

  it("shows an add-to-cart button", () => {
    renderWithContext(<ViewProjectDetails />, { rounds: [roundWithProjects] });

    expect(screen.getByTestId("add-to-cart")).toBeInTheDocument();
  });

  it("shows a remove-from-cart button replacing add-to-cart when add-to-cart is clicked", () => {
    renderWithContext(<ViewProjectDetails />, { rounds: [roundWithProjects] });
    const addToCart = screen.getByTestId("add-to-cart");
    fireEvent.click(addToCart);
    setTimeout(() => {
      // wait three seconds after the user clicks add before proceeding
      expect(screen.getByTestId("remove-from-cart")).toBeInTheDocument();
      expect(screen.queryByTestId("add-to-cart")).not.toBeInTheDocument();
    }, 3000);
  });

  it("shows a add-to-cart button replacing a remove-from-cart button when remove-from-balled is clicked", () => {
    renderWithContext(<ViewProjectDetails />, { rounds: [roundWithProjects] });

    // click add to cart
    const addToCart = screen.getByTestId("add-to-cart");
    fireEvent.click(addToCart);
    setTimeout(() => {
      // wait three seconds after the user clicks add before proceeding
      expect(screen.getByTestId("remove-from-cart")).toBeInTheDocument();
      expect(screen.queryByTestId("add-to-cart")).not.toBeInTheDocument();
      // click remove from cart
      const removeFromCart = screen.getByTestId("remove-from-cart");
      fireEvent.click(removeFromCart);
      expect(screen.getByTestId("add-to-cart")).toBeInTheDocument();
      expect(screen.queryByTestId("remove-from-cart")).not.toBeInTheDocument();
    }, 3000);
  });
});
