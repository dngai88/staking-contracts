// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract StakingContractUpgradeable is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20PermitUpgradeable;

    struct PhaseInfo {
        uint256 startTime;
        uint256 duration;
        uint256 totalReward;
        uint256 totalContribution;
    }

    PhaseInfo[] public phases;

    //Distribution of user for each phase
    mapping(address => mapping(uint256 => uint256)) userContributionInPhase;
    mapping(address => uint256) userStake;
    mapping(address => uint256) phaseNotCalculated;

    //Reward user got for each phase, non-zero mean user got reward
    mapping(address => uint256) rewardUserGotInPhase;

    uint256 public currentPhase;
    uint256 public totalStake;

    IERC20Upgradeable stakeToken;
    IERC20Upgradeable rewardToken;

    event PhaseStarted(uint256 indexed currentPhase, uint256 duration);
    event UserStaked(address indexed user, uint256 amount);

    function initialize(address stakeToken_, address rewardToken_) public initializer {
        stakeToken = IERC20Upgradeable(stakeToken_);
        rewardToken = IERC20Upgradeable(rewardToken_);
    }

    function startPhase(uint256 duration_) external onlyOwner {
        require(
            currentPhase == 0 
            || phases[currentPhase - 1].startTime + phases[currentPhase - 1].duration < block.timestamp,
            "startPhase::Previous phase not ended"
        );
        PhaseInfo storage currentPhaseInfo = phases[currentPhase];
        currentPhaseInfo.startTime = block.timestamp;
        currentPhaseInfo.duration = duration_;
        currentPhaseInfo.totalContribution = totalStake * duration_;

        currentPhase += 1;
        emit PhaseStarted(currentPhase, duration_);
    }

    function stake(uint256 stakeAmount) public {
        for (uint256 i = phaseNotCalculated[msg.sender]; i < currentPhase; i++) {
            userContributionInPhase[msg.sender][i]+= userStake[msg.sender] * phases[i].duration;
        }
        phaseNotCalculated[msg.sender] = currentPhase;

        if (phases[currentPhase - 1].startTime <= block.timestamp && phases[currentPhase - 1].startTime + phases[currentPhase - 1].duration >= block.timestamp) {
            uint256 timeLeft = phases[currentPhase - 1].duration - (block.timestamp - phases[currentPhase - 1].startTime);
            phases[currentPhase - 1].totalContribution += timeLeft * stakeAmount;
            userContributionInPhase[msg.sender][currentPhase - 1] += timeLeft * stakeAmount;
        }

        totalStake += stakeAmount;
        userStake[msg.sender] += stakeAmount;

        emit UserStaked(msg.sender, stakeAmount);
    }
}