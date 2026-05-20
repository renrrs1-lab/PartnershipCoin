// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @custom:security-contact partnercoinproject@gmail.com
contract PartnershipCrypto is ERC20, ERC20Burnable, ERC20Permit, Ownable {

    uint256 public constant MAX_SUPPLY = 1000000 * 10 ** 18;

    constructor(address recipient, address initialOwner)
        ERC20("PartnershipCoin", "PARC")
        ERC20Permit("PartnershipCoin")
        Ownable(initialOwner)
    {
        _mint(recipient, MAX_SUPPLY);
    }
}
