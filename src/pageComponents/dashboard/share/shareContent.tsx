import { useEffect, useState } from "react";
import { TrashIcon } from "@heroicons/react/solid";
import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find, isEmpty, isNull } from "lodash";
import Avatar from "react-avatar";
import { useForm, type SubmitHandler } from "react-hook-form";

import useUpdateCategoryOptimisticMutation from "../../../async/mutationHooks/category/useUpdateCategoryOptimisticMutation";
import useDeleteSharedCategoriesUserMutation from "../../../async/mutationHooks/share/useDeleteSharedCategoriesUserMutation";
import useSendCollaborationEmailInviteMutation from "../../../async/mutationHooks/share/useSendCollaborationEmailInviteMutation";
import useUpdateSharedCategoriesUserAccessMutation from "../../../async/mutationHooks/share/useUpdateSharedCategoriesUserAccessMutation";
import useGetUserProfilePic from "../../../async/queryHooks/user/useGetUserProfilePic";
import AriaSelect from "../../../components/ariaSelect";
import Input from "../../../components/atoms/input";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import DownArrowGray from "../../../icons/downArrowGray";
import GlobeIcon from "../../../icons/globeIcon";
import LinkIcon from "../../../icons/linkIcon";
import { useMiscellaneousStore } from "../../../store/componentStore";
import {
	type CategoriesData,
	type CollabDataInCategory,
} from "../../../types/apiTypes";
import { mutationApiCall } from "../../../utils/apiHelpers";
import { CATEGORIES_KEY, EMAIL_CHECK_PATTERN } from "../../../utils/constants";
import { getUserNameFromEmail } from "../../../utils/helpers";
import { errorToast, successToast } from "../../../utils/toastMessages";

const AccessUserInfo = (props: { item: CollabDataInCategory }) => {
	const session = useSession();
	const { item } = props;

	const { updateSharedCategoriesUserAccessMutation } =
		useUpdateSharedCategoriesUserAccessMutation();

	const { deleteSharedCategoriesUserMutation } =
		useDeleteSharedCategoriesUserMutation();

	const renderRightContent = () => {
		const rightTextStyles =
			"text-13 font-medium leading-[15px] text-custom-gray-10";
		if (item.is_accept_pending) {
			return (
				<div className=" flex items-center space-x-1">
					<p className={rightTextStyles}>pending</p>
					<figure>
						<TrashIcon
							className="h-4 w-4 cursor-pointer text-red-400 hover:text-red-600"
							onClick={() => {
								void mutationApiCall(
									deleteSharedCategoriesUserMutation.mutateAsync({
										id: item.share_id as number,
										session,
									}),
								);
							}}
						/>
					</figure>
				</div>
			);
		}

		return (
			<>
				{item.isOwner ? (
					<p className={rightTextStyles}>Owner</p>
				) : (
					<AriaSelect
						defaultValue={item.edit_access ? "Can Edit" : "Can View"}
						onOptionClick={async (value) => {
							if (value !== "No Access") {
								const response = (await mutationApiCall(
									updateSharedCategoriesUserAccessMutation.mutateAsync({
										id: item.share_id as number,
										updateData: {
											edit_access: Boolean(
												Number.parseInt(value === "Can Edit" ? "1" : "0", 10),
											),
										},
										session,
									}),
								)) as { error: Error };

								if (isNull(response?.error)) {
									successToast("User role changed");
								}
							} else {
								void mutationApiCall(
									deleteSharedCategoriesUserMutation.mutateAsync({
										id: item.share_id as number,
										session,
									}),
								);
							}
						}}
						options={[
							{ label: "Can Edit", value: "Can Edit" },
							{ label: "Can View", value: "Can View" },
							{ label: "No Access", value: "No Access" },
						]}
						renderCustomSelectButton={() => (
							<div className="flex items-center">
								<p className=" mr-1">
									{item.edit_access ? "Can Edit" : "Can View"}
								</p>
								<figure>
									<DownArrowGray />
								</figure>
							</div>
						)}
					/>
				)}
			</>
		);
	};

	const { userProfilePicData } = useGetUserProfilePic(item?.userEmail);

	return (
		<div className="flex items-center justify-between px-2 py-[5px]">
			<div className="flex items-center justify-between">
				{!isNull(userProfilePicData?.data) &&
				userProfilePicData?.data[0]?.profile_pic ? (
					// disabling as we dont know the src origin url of the img
					// eslint-disable-next-line @next/next/no-img-element
					<img
						alt="profile-pic"
						className="mr-1 h-5 w-5 rounded-full object-cover"
						src={userProfilePicData?.data[0]?.profile_pic}
					/>
				) : (
					<Avatar
						className="mr-1"
						name={
							!isNull(userProfilePicData?.data)
								? userProfilePicData?.data[0]?.profile_pic ?? ""
								: ""
						}
						round
						size="20"
						src={
							(!isNull(userProfilePicData?.data) &&
								userProfilePicData?.data[0]?.profile_pic) ||
							undefined
						}
					/>
				)}
				<p className=" ml-[6px] w-[171px] truncate text-13 font-450 leading-[15px] text-custom-gray-1">
					{item.userEmail}
				</p>
			</div>
			<div>{renderRightContent()}</div>
		</div>
	);
};

type EmailInput = {
	email: string;
};

const ShareContent = () => {
	const [publicUrl, setPublicUrl] = useState("");
	const [linkCopied, setLinkCopied] = useState(false);
	const [inviteUserEditAccess, setInviteUserEditAccess] = useState(false);

	const queryClient = useQueryClient();
	const session = useSession();
	const { category_id: categoryId } = useGetCurrentCategoryId();

	const shareCategoryId = useMiscellaneousStore(
		(state) => state.shareCategoryId,
	);
	// categoryId will only be there for nav bar share and shareCategoryId will be there for side pane share
	const dynamicCategoryId = shareCategoryId ?? categoryId;

	const { updateCategoryOptimisticMutation } =
		useUpdateCategoryOptimisticMutation();

	const { sendCollaborationEmailInviteMutation } =
		useSendCollaborationEmailInviteMutation();

	useEffect(() => {
		if (typeof window !== "undefined") {
			const categorySlug = currentCategory?.category_slug as string;
			const userName = getUserNameFromEmail(
				currentCategory?.user_id?.email ?? "",
			) as string;
			const url = `${window?.location?.origin}/${userName}/${categorySlug}`;
			setPublicUrl(url);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session?.user.id, dynamicCategoryId]);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<EmailInput>();

	const onSubmit: SubmitHandler<EmailInput> = async (data) => {
		const emailList = data?.email?.split(",");
		try {
			const email = emailList[0];

			const isEmailExist = find(
				currentCategory?.collabData,
				(item) => item?.userEmail === email,
			);

			if (!isEmailExist) {
				await mutationApiCall(
					sendCollaborationEmailInviteMutation.mutateAsync({
						emailList,
						edit_access: inviteUserEditAccess,
						category_id: dynamicCategoryId as number,
						hostUrl: window?.location?.origin,
						userId: session?.user.id as unknown as string,
						session,
					}),
				);

				reset({ email: "" });
				successToast("Invite sent");
			} else {
				errorToast("This email is already a collaborator");
			}
		} catch {
			errorToast("Something went wrong");
		}
	};

	const categoryData = queryClient.getQueryData([
		CATEGORIES_KEY,
		session?.user.id,
	]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const currentCategory = find(
		categoryData?.data,
		(item) => item?.id === dynamicCategoryId,
	);

	return (
		<div>
			<form onSubmit={handleSubmit(onSubmit)}>
				<Input
					{...register("email", {
						required: true,
						pattern: EMAIL_CHECK_PATTERN,
					})}
					className="rounded-none  bg-transparent text-sm leading-4 shadow-none outline-none"
					errorClassName="ml-2"
					errorIconClassName="right-[48px]"
					errorText={errors.email ? "Enter valid email" : ""}
					isError={!isEmpty(errors)}
					placeholder="Enter emails or names"
					rendedRightSideElement={
						<AriaSelect
							defaultValue="View"
							onOptionClick={(value) =>
								setInviteUserEditAccess(value === "Editor")
							}
							options={[
								{ label: "Editor", value: "Editor" },
								{ label: "View", value: "View" },
							]}
							// disabled
							renderCustomSelectButton={() => (
								<div className="flex items-center">
									<p className=" mr-1">
										{inviteUserEditAccess ? "Editor" : "View"}
									</p>
									<figure>
										<DownArrowGray />
									</figure>
								</div>
							)}
						/>
					}
					wrapperClassName="py-[7px] px-[10px] bg-custom-gray-11 rounded-lg flex items-center justify-between relative"
				/>
			</form>
			<div className=" pt-3">
				<p className=" px-2 py-[6px] text-xs font-450 leading-[14px] text-custom-gray-10">
					People with access
				</p>
				<div className="pb-2">
					{currentCategory?.collabData?.map((item) => (
						<AccessUserInfo item={item} key={item.userEmail} />
					))}
				</div>
				<div className="mx-2 flex items-end justify-between border-y-[1px] border-custom-gray-11 py-[15.5px]">
					<div className=" flex items-center">
						<figure>
							<GlobeIcon />
						</figure>
						<p className="ml-[6px] text-13 font-450 leading-[15px] text-custom-gray-1">
							Anyone with link
						</p>
					</div>
					<AriaSelect
						defaultValue={
							currentCategory?.is_public ? "View access" : "No access"
						}
						onOptionClick={async (value) => {
							await mutationApiCall(
								updateCategoryOptimisticMutation.mutateAsync({
									category_id: dynamicCategoryId,
									updateData: {
										is_public: value === "View access",
									},
									session,
								}),
							);
							setLinkCopied(false);
						}}
						options={[
							{ label: "View access", value: "View access" },
							{ label: "No access", value: "No access" },
						]}
						renderCustomSelectButton={() => (
							<div className="flex items-center">
								<p className=" mr-1">
									{currentCategory?.is_public ? "View access" : "No access"}
								</p>
								<figure>
									<DownArrowGray />
								</figure>
							</div>
						)}
					/>
				</div>
				<div
					className={`flex items-center p-2 ${
						currentCategory?.is_public ? " cursor-pointer" : " opacity-50"
					}`}
					onClick={() => {
						if (currentCategory?.is_public) {
							void navigator.clipboard.writeText(publicUrl);
							setLinkCopied(true);
						}
					}}
					onKeyDown={() => {}}
					role="button"
					tabIndex={0}
				>
					<figure>
						<LinkIcon />
					</figure>
					<p className="ml-[6px] text-13 font-450 leading-[15px] text-custom-gray-1">
						{linkCopied ? "Link copied" : "Copy link"}
					</p>
				</div>
			</div>
		</div>
	);
};

export default ShareContent;
