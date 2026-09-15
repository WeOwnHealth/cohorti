// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AuditAnchor} from "../src/AuditAnchor.sol";

contract AuditAnchorTest is Test {
    AuditAnchor anchor_;
    address admin = address(0xA11CE);
    address auditSvc = address(0xB0B);
    address stranger = address(0xEE);

    function setUp() public {
        anchor_ = new AuditAnchor(admin);
    }

    function test_admin_can_anchor() public {
        vm.prank(admin);
        uint256 index = anchor_.anchor(keccak256("digest-1"));
        assertEq(index, 0);
        assertEq(anchor_.count(), 1);
        assertEq(anchor_.latest().digest, keccak256("digest-1"));
    }

    function test_unauthorized_cannot_anchor() public {
        vm.prank(stranger);
        vm.expectRevert(AuditAnchor.NotAuthorizedAnchorer.selector);
        anchor_.anchor(keccak256("digest-1"));
    }

    function test_admin_can_authorize_another_anchorer() public {
        vm.prank(admin);
        anchor_.setAnchorer(auditSvc, true);

        vm.prank(auditSvc);
        anchor_.anchor(keccak256("digest-1"));
        assertEq(anchor_.count(), 1);
    }

    function test_revoked_anchorer_can_no_longer_anchor() public {
        vm.prank(admin);
        anchor_.setAnchorer(auditSvc, true);
        vm.prank(admin);
        anchor_.setAnchorer(auditSvc, false);

        vm.prank(auditSvc);
        vm.expectRevert(AuditAnchor.NotAuthorizedAnchorer.selector);
        anchor_.anchor(keccak256("digest-1"));
    }

    function test_history_is_append_only_and_ordered() public {
        vm.startPrank(admin);
        anchor_.anchor(keccak256("digest-1"));
        anchor_.anchor(keccak256("digest-2"));
        anchor_.anchor(keccak256("digest-3"));
        vm.stopPrank();

        assertEq(anchor_.count(), 3);
        assertEq(anchor_.at(0).digest, keccak256("digest-1"));
        assertEq(anchor_.at(1).digest, keccak256("digest-2"));
        assertEq(anchor_.at(2).digest, keccak256("digest-3"));
        assertEq(anchor_.latest().digest, keccak256("digest-3"));
    }

    function test_latest_reverts_on_empty_history() public {
        vm.expectRevert(AuditAnchor.EmptyHistory.selector);
        anchor_.latest();
    }

    function test_at_reverts_out_of_range() public {
        vm.prank(admin);
        anchor_.anchor(keccak256("digest-1"));

        vm.expectRevert(AuditAnchor.IndexOutOfRange.selector);
        anchor_.at(1);
    }

    function test_only_admin_can_transfer_admin() public {
        vm.prank(stranger);
        vm.expectRevert(AuditAnchor.NotAdmin.selector);
        anchor_.transferAdmin(stranger);

        vm.prank(admin);
        anchor_.transferAdmin(stranger);
        assertEq(anchor_.admin(), stranger);
    }
}
