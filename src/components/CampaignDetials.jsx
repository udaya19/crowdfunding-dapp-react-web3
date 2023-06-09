import React, { useState, useEffect, useContext } from "react";
import Table from "react-bootstrap/Table";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { BsWhatsapp } from "react-icons/bs";
import { WhatsappShareButton } from "react-share";

import web3 from "../utils/web3";
import getDonorsList from "../utils/getDonorsListForCampaign";
import contractInstance from "../utils/contractInstance";
import calculateDaysLeft from "../utils/daysLeft";
import { weiToEther } from "../utils/ether-wei";

import AccountsContext from "../context/accounts";

import Loader from "./Loader";

const CampaignDetails = () => {
  const [campaign, setCampaign] = useState();
  const [donation, setDonation] = useState();
  const [daysLeft, setDaysLeft] = useState();
  const [image, setImage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [percentageCompleted, setPercentageCompleted] = useState(Number);
  const [targetInEther, setTargetInEther] = useState();
  const [receivedInEther, setReceivedInEther] = useState();
  const [donors, setDonors] = useState([{ donor: "", amount: Number }]);
  const [loading, setLoading] = useState(false);
  const { accounts } = useContext(AccountsContext);
  const { id } = useParams();
  const getCampaignById = async () => {
    try {
      setLoading(true);
      const campaign = await contractInstance.methods
        .getCampaignDetails(id)
        .call();
      const targetAmount = weiToEther(campaign?.target);
      const receivedAmount = weiToEther(campaign?.received);
      setTargetInEther(targetAmount);
      setReceivedInEther(receivedAmount);
      setCampaign(campaign);
      console.log("Campaign details:", campaign);
      const days = calculateDaysLeft(campaign?.deadline);
      setDaysLeft(days);
      setImage(`https://ipfs.io/ipfs/${campaign?.imageUrl}`);
      const data = await axios.get(
        `https://ipfs.io/ipfs/${campaign?.imageUrl}`
      );
      setImageUrl(data.data);
      percentageAmountReceived();
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log(error.message);
    }
  };

  const donateCampaign = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const donateMethod = contractInstance.methods.donateToCampaign(id);
      console.log("Donate method:", donateMethod);
      const txtObj = await donateMethod.send({
        from: accounts[0],
        value: web3.utils.toWei(donation, "ether"),
      });
      console.log(txtObj);
      getCampaignById();
      percentageCompleted();
      getDonors();
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log("Error while donating to campaign:", error.message);
    }
  };

  const percentageAmountReceived = () => {
    console.log(`Received:${receivedInEther}`);
    console.log(`Target:${targetInEther}`);
    const percentage = Math.round((receivedInEther / targetInEther) * 100);
    console.log("Percentage completed:", percentage);
    percentage && setPercentageCompleted(percentage);
  };

  const getDonors = async () => {
    const donorsList = await getDonorsList(id);
    const input = `${donorsList}`;
    const data = input.split(",");
    console.log("data", data);
    const res = [];
    for (let i = 0; i < data.length; i += 2) {
      const donor = data[i];
      const amount = Number(data[i + 1]);
      const amountInEther = Number(weiToEther(amount.toString()));
      const index = res.findIndex((r) => r.donor === donor);
      console.log("Index", index);
      if (index === -1) {
        res.push({ donor, amount: amountInEther });
      } else {
        res[index].amount += amountInEther;
      }
    }
    console.log("Res:", res);
    setDonors(res);
  };
  useEffect(() => {
    getCampaignById();
    getDonors();
  }, [receivedInEther, targetInEther, percentageCompleted]);
  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className="container mx-auto py-4">
          <h1 className="text-4xl font-bold mb-4 text-center">
            {campaign?.title}
          </h1>
          <div className="">
            <h1 className="text-2xl font-semibold">About fundraiser</h1>
            <p className="text-gray-700 mb-4 text-[18px]">
              {campaign?.description}
            </p>
          </div>
          <div className="flex gap-5">
            <div className="image">
              <img src={imageUrl} alt="Campaign" width={300} height={50} />
            </div>
            <div className="campaign">
              <p className="text-gray-700 mb-2 font-extrabold text-4xl">
                {/* <strong>Current amount:</strong>  */}
                {receivedInEther} Ethers <br />
              </p>
              <p className="text-gray-700 mb-2">
                {/* <strong>Goal:</strong> */}
                raised of {targetInEther} Ethers
              </p>

              <p className="text-gray-700 mb-2">
                <strong>End date:</strong> {campaign?.deadline}
              </p>
              {/* <div className="w-80 h-4 border-2 border-solid rounded-lg"> */}
              {/* {percentageCompleted >= 0 && (
                  <div
                    style={{ width: `${percentageCompleted} !important` }}
                    className={`rounded-lg bg-green-600 height`}
                  ></div>
                )} */}
              {/* </div> */}
              <div className="flex mt-6">
                <p className="text-sm">
                  <span className="text-4xl">{daysLeft}</span> days left
                </p>
              </div>
              <div className="flex mt-6">
                <p className="text-sm">
                  <span className="text-4xl">{percentageCompleted}</span> %
                  completed
                </p>
              </div>
              {campaign?.completed && (
                <div className="flex mt-6">
                  <p className="text-sm">
                    <span className="text-4xl">Campaign Closed</span>
                  </p>
                </div>
              )}

              <div className="share mt-16">
                <WhatsappShareButton
                  url={`http://localhost:3000/${id}`}
                  title={campaign?.title}
                  separator=" "
                >
                  <button className="bg-green-400 text-white py-2 px-7 flex justify-center items-center gap-2">
                    <BsWhatsapp />
                    Spread the word
                  </button>
                </WhatsappShareButton>
              </div>
            </div>
          </div>
          {accounts[0] !== campaign?.receipientAddress ? (
            <>
              {!campaign?.completed && (
                <form className="mb-4">
                  <div className="mb-4">
                    <label
                      className="block text-gray-700 font-bold mb-2"
                      htmlFor="donationAmount"
                    >
                      Donation amount
                    </label>
                    <input
                      className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="donationAmount"
                      type="number"
                      placeholder="Enter donation amount in ether"
                      value={donation}
                      onChange={(e) => setDonation(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    onClick={donateCampaign}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Donate
                  </button>
                </form>
              )}
            </>
          ) : (
            <Link to={`/update/${campaign?.id}`}>
              <button className="bg-blue-500 mt-6 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Update Campaign
              </button>
            </Link>
          )}

          <div className="mt-6">
            <Table striped bordered hover responsive="md">
              <thead>
                <tr>
                  <th className="text-center">#</th>
                  <th className="text-center">Address</th>
                  <th className="text-center">Amount</th>
                </tr>
              </thead>
              <tbody>
                {donors?.map((donor, index) => (
                  <>
                    <tr key={index}>
                      <td className="text-center">{index}</td>
                      <td className="text-center">
                        <Link
                          className="no-underline"
                          to={`/donor/${donor.donor}`}
                        >
                          {donor.donor}
                        </Link>
                      </td>
                      <td className="text-center">{donor.amount} Ethers</td>
                    </tr>
                  </>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
};

export default CampaignDetails;
